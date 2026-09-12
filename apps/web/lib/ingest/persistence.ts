import type { SupabaseClient } from "@supabase/supabase-js";
import type { NormalizedOpportunity, SourceCursor } from "./types";

/**
 * DB write layer for the ingestion runner. Every function takes an
 * already-authenticated `SupabaseClient` (typically the service-role
 * client) — RLS is bypassed at the client level.
 *
 * Kept as pure functions so the runner can be tested against a fake
 * client without needing a real DB.
 */

export interface ExistingOpportunity {
  id: string;
  contentHash: string;
}

export interface SyncRunCounts {
  status: "success" | "partial" | "failed";
  recordsFetched: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsUnchanged: number;
  recordsFailed: number;
  errorSummary?: string;
}

/** Insert a `source_sync_runs` row with status='running'; return the id. */
export async function beginSyncRun(
  supabase: SupabaseClient,
  sourceKey: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("source_sync_runs")
    .insert({ source_key: sourceKey, status: "running" })
    .select("id")
    .single();
  if (error) throw new Error(`beginSyncRun: ${error.message}`);
  return (data as { id: string }).id;
}

/** Terminal update for a run: counts + status + optional error summary. */
export async function endSyncRun(
  supabase: SupabaseClient,
  runId: string,
  counts: SyncRunCounts,
): Promise<void> {
  const patch: Record<string, unknown> = {
    status: counts.status,
    finished_at: new Date().toISOString(),
    records_fetched: counts.recordsFetched,
    records_created: counts.recordsCreated,
    records_updated: counts.recordsUpdated,
    records_unchanged: counts.recordsUnchanged,
    records_failed: counts.recordsFailed,
  };
  if (counts.errorSummary !== undefined) {
    patch.error_summary = counts.errorSummary;
  }
  const { error } = await supabase
    .from("source_sync_runs")
    .update(patch)
    .eq("id", runId);
  if (error) throw new Error(`endSyncRun: ${error.message}`);
}

/** Upsert a raw record into `source_records` keyed on (source_key, external_id). */
export async function upsertSourceRecord(
  supabase: SupabaseClient,
  input: {
    sourceKey: string;
    externalId: string;
    sourceUrl: string;
    payload: unknown;
    contentHash: string;
  },
): Promise<void> {
  const { error } = await supabase.from("source_records").upsert(
    {
      source_key: input.sourceKey,
      external_id: input.externalId,
      source_url: input.sourceUrl,
      payload: input.payload,
      content_hash: input.contentHash,
      fetched_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "source_key,external_id" },
  );
  if (error) throw new Error(`upsertSourceRecord: ${error.message}`);
}

/** Read the existing opportunity for revision detection. */
export async function findOpportunityByExternalId(
  supabase: SupabaseClient,
  sourceKey: string,
  externalId: string,
): Promise<ExistingOpportunity | null> {
  const { data, error } = await supabase
    .from("opportunities")
    .select("id, content_hash")
    .eq("source_key", sourceKey)
    .eq("external_id", externalId)
    .maybeSingle();
  if (error) throw new Error(`findOpportunityByExternalId: ${error.message}`);
  if (!data) return null;
  const row = data as { id: string; content_hash: string };
  return { id: row.id, contentHash: row.content_hash };
}

/** Upsert an opportunity; returns its id. */
export async function upsertOpportunity(
  supabase: SupabaseClient,
  normalized: NormalizedOpportunity,
): Promise<string> {
  const row = normalizedToRow(normalized);
  const { data, error } = await supabase
    .from("opportunities")
    .upsert(row, { onConflict: "source_key,external_id" })
    .select("id")
    .single();
  if (error) throw new Error(`upsertOpportunity: ${error.message}`);
  return (data as { id: string }).id;
}

/**
 * Compute the next revision number for an opportunity.
 * Returns `max(revision_no) + 1`, or `1` if no revisions exist yet.
 */
export async function nextRevisionNo(
  supabase: SupabaseClient,
  opportunityId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("opportunity_revisions")
    .select("revision_no")
    .eq("opportunity_id", opportunityId)
    .order("revision_no", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`nextRevisionNo: ${error.message}`);
  if (!data) return 1;
  const row = data as { revision_no: number };
  return row.revision_no + 1;
}

/** Append an `opportunity_revisions` row for a detected material change. */
export async function writeRevision(
  supabase: SupabaseClient,
  input: {
    opportunityId: string;
    revisionNo: number;
    previousHash: string | null;
    newHash: string;
    changedFields: string[];
    changeSnapshot: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await supabase.from("opportunity_revisions").insert({
    opportunity_id: input.opportunityId,
    revision_no: input.revisionNo,
    previous_hash: input.previousHash,
    new_hash: input.newHash,
    changed_fields: input.changedFields,
    change_snapshot: input.changeSnapshot,
  });
  if (error) throw new Error(`writeRevision: ${error.message}`);
}

/** Advance the source's cursor + watermark. Call only after a successful run. */
export async function updateSourceCursor(
  supabase: SupabaseClient,
  sourceKey: string,
  cursor: SourceCursor | undefined,
  lastSuccessfulSyncAt: string,
): Promise<void> {
  const patch: Record<string, unknown> = {
    last_successful_sync_at: lastSuccessfulSyncAt,
  };
  if (cursor !== undefined) {
    patch.configuration = { cursor };
  }
  const { error } = await supabase
    .from("sources")
    .update(patch)
    .eq("key", sourceKey);
  if (error) throw new Error(`updateSourceCursor: ${error.message}`);
}

// ---------------------------------------------------------------
// helpers
// ---------------------------------------------------------------

function normalizedToRow(
  o: NormalizedOpportunity,
): Record<string, unknown> {
  return {
    source_key: o.sourceKey,
    external_id: o.externalId,
    source_url: o.sourceUrl,
    title: o.title,
    description: o.description ?? null,
    notice_type: o.noticeType ?? null,
    procurement_category: o.procurementCategory ?? null,
    procurement_method: o.procurementMethod ?? null,
    country_code: o.countryCode ?? null,
    country_name: o.countryName ?? null,
    region: o.region ?? null,
    district: o.district ?? null,
    issuer_name: o.issuerName ?? null,
    ministry_name: o.ministryName ?? null,
    agency_name: o.agencyName ?? null,
    procuring_entity_name: o.procuringEntityName ?? null,
    project_id: o.projectId ?? null,
    reference_no: o.referenceNo ?? null,
    sector: o.sector ?? null,
    tags: o.tags ?? null,
    publication_at: o.publicationAt ?? null,
    deadline_at: o.deadlineAt ?? null,
    currency: o.currency ?? null,
    estimated_value_min: o.estimatedValueMin ?? null,
    estimated_value_max: o.estimatedValueMax ?? null,
    status: o.status,
    language: o.rawLanguage ?? null,
    content_hash: o.contentHash,
    source_updated_at: o.sourceUpdatedAt ?? null,
    source_metadata: o.sourceMetadata ?? {},
    last_seen_at: new Date().toISOString(),
  };
}
