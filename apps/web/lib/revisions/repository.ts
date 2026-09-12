import type { SupabaseClient } from "@supabase/supabase-js";

/** Minimum revision fields we need for the badge + dashboard pane. */
export type RevisionRow = {
  id: string;
  opportunity_id: string;
  revision_no: number;
  changed_fields: string[];
  detected_at: string;
};

export type RecentRevisionWithOpp = RevisionRow & {
  opportunity: {
    id: string;
    title: string;
    source_key: string;
    country_code: string | null;
    deadline_at: string | null;
    reference_no: string | null;
  } | null;
};

export interface RevisionSummary {
  count: number;
  /**
   * Per ADR 0013 (Phase 2): deadline change is the *only* severity we
   * elevate visually. Anything else is a gray badge.
   */
  hasDeadlineChange: boolean;
}

/**
 * For each opportunity id, return `{ count, hasDeadlineChange }`.
 * Omits ids with no revisions. Returns an empty Map when input is [].
 */
/** All revisions for one opportunity, newest first. */
export async function listRevisionsForOpportunity(
  supabase: SupabaseClient,
  opportunityId: string,
): Promise<RevisionRow[]> {
  const { data, error } = await supabase
    .from("opportunity_revisions")
    .select("id, opportunity_id, revision_no, changed_fields, detected_at")
    .eq("opportunity_id", opportunityId)
    .order("detected_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as RevisionRow[] | null) ?? [];
}

export async function getRevisionSummaryForOpportunities(
  supabase: SupabaseClient,
  opportunityIds: string[],
): Promise<Map<string, RevisionSummary>> {
  const map = new Map<string, RevisionSummary>();
  if (opportunityIds.length === 0) return map;

  const { data, error } = await supabase
    .from("opportunity_revisions")
    .select("id, opportunity_id, revision_no, changed_fields, detected_at")
    .in("opportunity_id", opportunityIds)
    .order("detected_at", { ascending: false });
  if (error) throw new Error(error.message);

  for (const row of (data as RevisionRow[] | null) ?? []) {
    const prev = map.get(row.opportunity_id);
    const hasDeadline =
      Array.isArray(row.changed_fields) &&
      row.changed_fields.includes("deadline_at");
    if (prev) {
      prev.count += 1;
      if (hasDeadline) prev.hasDeadlineChange = true;
    } else {
      map.set(row.opportunity_id, {
        count: 1,
        hasDeadlineChange: hasDeadline,
      });
    }
  }
  return map;
}

/**
 * Recent amendments across all opportunities in the last `sinceDays`.
 * Joins the opportunity row so the UI has enough to link + label.
 * Row-count intentionally capped by the caller.
 */
export async function listRecentRevisions(
  supabase: SupabaseClient,
  sinceDays: number,
  limit = 20,
): Promise<RecentRevisionWithOpp[]> {
  const cutoff = new Date(
    Date.now() - sinceDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from("opportunity_revisions")
    .select(
      `id, opportunity_id, revision_no, changed_fields, detected_at,
       opportunity:opportunities(id, title, source_key, country_code,
                                 deadline_at, reference_no)`,
    )
    .gte("detected_at", cutoff)
    .order("detected_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  // supabase-js types nested selects as arrays (fk relationships → 1..N
  // at the type level). For opportunity_id → opportunities the row is
  // effectively 1..1; normalize the array to the first element or null.
  const rows = (data as unknown as Array<
    Omit<RecentRevisionWithOpp, "opportunity"> & {
      opportunity: RecentRevisionWithOpp["opportunity"][] | null;
    }
  > | null) ?? [];
  return rows.map((r) => ({
    ...r,
    opportunity: Array.isArray(r.opportunity)
      ? (r.opportunity[0] ?? null)
      : r.opportunity,
  }));
}
