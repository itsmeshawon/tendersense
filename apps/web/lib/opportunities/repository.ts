import type { SupabaseClient } from "@supabase/supabase-js";

/** Mirror of `public.opportunities` (migration 0009). */
export type Opportunity = {
  id: string;
  source_key: string;
  external_id: string;
  source_url: string;

  title: string;
  description: string | null;

  notice_type: string | null;
  procurement_category: string | null;
  procurement_method: string | null;

  country_code: string | null;
  country_name: string | null;
  region: string | null;
  district: string | null;

  issuer_name: string | null;
  ministry_name: string | null;
  agency_name: string | null;
  procuring_entity_name: string | null;

  project_id: string | null;
  reference_no: string | null;

  sector: string[] | null;
  tags: string[] | null;

  publication_at: string | null;
  deadline_at: string | null;

  currency: string | null;
  estimated_value_min: number | null;
  estimated_value_max: number | null;

  status: "open" | "closed" | "cancelled" | "awarded" | "unknown";
  language: string | null;

  content_hash: string;
  source_updated_at: string | null;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export type OpportunityStatusFilter = "open" | "closed";

export interface ListOpportunitiesParams {
  limit?: number;
  /** ISO-3166-2 country code, e.g. "BD". Filters rows where country_code matches. */
  country?: string;
  /** Source key, e.g. "world_bank" or "bd_egp". */
  source?: string;
  /**
   * Include only rows whose `deadline_at` falls within the next N days
   * from now. Also excludes rows with a null deadline. Common values
   * we'll expose in the UI: 7, 30, 90.
   */
  deadlineWithinDays?: number;
  /** Filter on `status`. */
  status?: OpportunityStatusFilter;
}

export async function listOpportunities(
  supabase: SupabaseClient,
  params: ListOpportunitiesParams = {},
): Promise<Opportunity[]> {
  const limit = Math.min(params.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

  let query = supabase.from("opportunities").select("*");

  if (params.country) {
    query = query.eq("country_code", params.country);
  }
  if (params.source) {
    query = query.eq("source_key", params.source);
  }
  if (params.status) {
    query = query.eq("status", params.status);
  }
  if (params.deadlineWithinDays !== undefined) {
    const now = new Date();
    const then = new Date(
      now.getTime() + params.deadlineWithinDays * 24 * 60 * 60 * 1000,
    );
    query = query
      .not("deadline_at", "is", null)
      .gte("deadline_at", now.toISOString())
      .lte("deadline_at", then.toISOString());
  }

  const { data, error } = await query
    .order("publication_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data as Opportunity[] | null) ?? [];
}
