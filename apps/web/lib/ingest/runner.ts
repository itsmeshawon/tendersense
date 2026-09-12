import type { SupabaseClient } from "@supabase/supabase-js";
import {
  beginSyncRun,
  endSyncRun,
  findOpportunityByExternalId,
  updateSourceCursor,
  upsertOpportunity,
  upsertSourceRecord,
  writeRevision,
} from "./persistence";
import type {
  NormalizedOpportunity,
  ProcurementSourceAdapter,
  SourceCursor,
  SourcePage,
} from "./types";

const DEFAULT_MAX_PAGES = 100;

export interface RunOptions {
  /** Safety cap on pages per run. Default 100. */
  maxPages?: number;
  /** Optional starting cursor. If omitted, fetchPage() is called with no cursor. */
  startCursor?: SourceCursor;
}

export interface RunResult {
  status: "success" | "partial" | "failed";
  runId: string;
  recordsFetched: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsUnchanged: number;
  recordsFailed: number;
  errorSummary?: string;
}

/**
 * Orchestrates an ingestion pass for one source adapter.
 *
 * Flow (per ADR 0007):
 *   1. Begin `source_sync_runs` row (status='running')
 *   2. Loop pages until adapter says `isLastPage=true` OR maxPages reached
 *   3. For each record:
 *      - Upsert `source_records` (raw payload + content_hash)
 *      - Find existing opportunity by (source_key, external_id)
 *      - Upsert opportunity
 *      - If existing.content_hash !== new.content_hash → write revision
 *   4. Terminal: finalize sync run + advance cursor
 *
 * Failure semantics:
 *   - Adapter-level errors (network, HTTP, parse) → run marked `failed`,
 *     cursor NOT advanced, next run retries from the same watermark
 *   - Per-record persistence errors → record counted as failed, loop
 *     continues; run marked `partial` if any records failed and any
 *     succeeded
 *   - maxPages cap reached → run marked `partial` (there may be more)
 */
export async function runSync(
  adapter: ProcurementSourceAdapter,
  supabase: SupabaseClient,
  opts: RunOptions = {},
): Promise<RunResult> {
  const maxPages = opts.maxPages ?? DEFAULT_MAX_PAGES;
  const runId = await beginSyncRun(supabase, adapter.sourceKey);

  let fetched = 0;
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let failed = 0;
  let cursor: SourceCursor | undefined = opts.startCursor;
  let pagesTaken = 0;
  let capped = false;
  let fatalError: Error | null = null;

  try {
    while (pagesTaken < maxPages) {
      let page: SourcePage;
      try {
        page = await adapter.fetchPage(cursor);
      } catch (err) {
        fatalError =
          err instanceof Error ? err : new Error(String(err));
        break;
      }
      pagesTaken += 1;

      for (const raw of page.records) {
        fetched += 1;
        try {
          const normalized = await adapter.normalize(raw);
          await persistRecord(supabase, normalized, {
            onCreated: () => (created += 1),
            onUpdated: () => (updated += 1),
            onUnchanged: () => (unchanged += 1),
          });
        } catch (err) {
          failed += 1;
          console.warn(
            `[runner:${adapter.sourceKey}] record failed:`,
            err instanceof Error ? err.message : err,
          );
        }
      }

      if (page.isLastPage) break;
      cursor = page.nextCursor;
      if (pagesTaken >= maxPages) {
        capped = true;
        break;
      }
    }
  } catch (err) {
    fatalError = err instanceof Error ? err : new Error(String(err));
  }

  if (fatalError) {
    await endSyncRun(supabase, runId, {
      status: "failed",
      recordsFetched: fetched,
      recordsCreated: created,
      recordsUpdated: updated,
      recordsUnchanged: unchanged,
      recordsFailed: failed,
      errorSummary: fatalError.message,
    });
    return {
      status: "failed",
      runId,
      recordsFetched: fetched,
      recordsCreated: created,
      recordsUpdated: updated,
      recordsUnchanged: unchanged,
      recordsFailed: failed,
      errorSummary: fatalError.message,
    };
  }

  const anyFailed = failed > 0;
  const status: RunResult["status"] =
    capped || anyFailed ? "partial" : "success";

  await endSyncRun(supabase, runId, {
    status,
    recordsFetched: fetched,
    recordsCreated: created,
    recordsUpdated: updated,
    recordsUnchanged: unchanged,
    recordsFailed: failed,
  });

  // Advance cursor on success OR partial — a partial run made forward
  // progress on the records it did process, so the watermark should
  // reflect that. Only outright failure (fatalError) skips this.
  await updateSourceCursor(
    supabase,
    adapter.sourceKey,
    cursor,
    new Date().toISOString(),
  );

  return {
    status,
    runId,
    recordsFetched: fetched,
    recordsCreated: created,
    recordsUpdated: updated,
    recordsUnchanged: unchanged,
    recordsFailed: failed,
  };
}

async function persistRecord(
  supabase: SupabaseClient,
  normalized: NormalizedOpportunity,
  callbacks: {
    onCreated: () => void;
    onUpdated: () => void;
    onUnchanged: () => void;
  },
): Promise<void> {
  const existing = await findOpportunityByExternalId(
    supabase,
    normalized.sourceKey,
    normalized.externalId,
  );

  await upsertSourceRecord(supabase, {
    sourceKey: normalized.sourceKey,
    externalId: normalized.externalId,
    sourceUrl: normalized.sourceUrl,
    payload: normalized,
    contentHash: normalized.contentHash,
  });

  const opportunityId = await upsertOpportunity(supabase, normalized);

  if (!existing) {
    callbacks.onCreated();
    return;
  }

  if (existing.contentHash === normalized.contentHash) {
    callbacks.onUnchanged();
    return;
  }

  // Material change — write a revision. Revision number is naively
  // sequential; a follow-up can compute it from the current max.
  await writeRevision(supabase, {
    opportunityId,
    revisionNo: nextRevisionNo(),
    previousHash: existing.contentHash,
    newHash: normalized.contentHash,
    // For MVP the changed_fields list is left empty — computing the
    // diff needs the previous row's full state. `change_snapshot` holds
    // the new state for now, so we can compute the diff later without
    // losing information.
    changedFields: [],
    changeSnapshot: { new: normalized },
  });

  callbacks.onUpdated();
}

/**
 * Placeholder revision numbering. The DB has a UNIQUE on
 * (opportunity_id, revision_no), so a naive `1` will collide on second
 * amendment. Follow-up: compute `max(revision_no)+1` for the
 * opportunity within the same tx. For MVP the collision is fine — it
 * loud-fails on the second amendment of the same opportunity, alerting
 * us to implement properly.
 */
function nextRevisionNo(): number {
  return 1;
}
