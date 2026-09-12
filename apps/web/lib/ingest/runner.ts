import type { SupabaseClient } from "@supabase/supabase-js";
import {
  beginSyncRun,
  endSyncRun,
  findOpportunityByExternalId,
  nextRevisionNo,
  updateSourceCursor,
  upsertOpportunity,
  upsertSourceRecord,
  writeRevision,
} from "./persistence";
import { fanoutRevisionNotifications } from "../notifications/fanout";
import { recomputeForOpportunity } from "../matching/recompute";
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

  // Match-recompute is best-effort — logged failures do not fail the
  // record. Runs for both created + updated (skipped in the unchanged
  // branch to avoid pointless re-scoring on every cron tick).
  const scorableOpp = {
    id: opportunityId,
    source_key: normalized.sourceKey,
    country_code: normalized.countryCode ?? null,
    sector: normalized.sector ?? null,
    title: normalized.title,
    description: normalized.description ?? null,
  };

  if (!existing) {
    try {
      await recomputeForOpportunity(supabase, scorableOpp);
    } catch (err) {
      console.warn(
        "[runner] recompute threw:",
        err instanceof Error ? err.message : err,
      );
    }
    callbacks.onCreated();
    return;
  }

  if (existing.contentHash === normalized.contentHash) {
    callbacks.onUnchanged();
    return;
  }

  const changedFields: string[] = [];
  if ((existing.deadlineAt ?? null) !== (normalized.deadlineAt ?? null)) {
    changedFields.push("deadline_at");
  }
  if (existing.title !== normalized.title) {
    changedFields.push("title");
  }
  if (existing.status !== normalized.status) {
    changedFields.push("status");
  }

  const revisionNo = await nextRevisionNo(supabase, opportunityId);
  const revisionId = await writeRevision(supabase, {
    opportunityId,
    revisionNo,
    previousHash: existing.contentHash,
    newHash: normalized.contentHash,
    changedFields,
    changeSnapshot: { new: normalized },
  });

  // Best-effort fanout to matching monitoring profiles. Errors are
  // logged inside fanoutRevisionNotifications; the revision write
  // already succeeded, so we do not fail the record here.
  try {
    await fanoutRevisionNotifications(supabase, {
      revisionId,
      opportunity: {
        id: opportunityId,
        source_key: normalized.sourceKey,
        country_code: normalized.countryCode ?? null,
        procurement_method: normalized.procurementMethod ?? null,
        sector: normalized.sector ?? null,
        title: normalized.title,
        description: normalized.description ?? null,
        reference_no: normalized.referenceNo ?? null,
      },
      changedFields,
    });
  } catch (err) {
    console.warn(
      "[runner] fanout threw unexpectedly:",
      err instanceof Error ? err.message : err,
    );
  }

  try {
    await recomputeForOpportunity(supabase, scorableOpp);
  } catch (err) {
    console.warn(
      "[runner] recompute threw on update:",
      err instanceof Error ? err.message : err,
    );
  }

  callbacks.onUpdated();
}
