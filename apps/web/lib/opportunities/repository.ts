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

/**
 * Sort options for /opportunities.
 * - `publication_desc` (default): newest first
 * - `deadline_asc`: soonest deadline first (nulls last)
 * - `value_desc`: largest estimated value first (nulls last)
 * - `relevance`: FTS rank desc; only meaningful when `q` is set
 */
export type OpportunitySort =
  | "publication_desc"
  | "deadline_asc"
  | "value_desc"
  | "relevance";

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
  /**
   * Free-text query against the `search_text` tsvector column (populated
   * by trigger in migration 0009). Uses `websearch_to_tsquery` semantics
   * per ADR 0012 — supports quoted phrases and `OR` operators.
   */
  q?: string;
  /** Sort order. Defaults to `publication_desc`. */
  sort?: OpportunitySort;
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
  if (params.q && params.q.trim().length > 0) {
    // `websearch` dialect per ADR 0012 — user-facing search box.
    // Config MUST match migration 0009's trigger, which builds the
    // tsvector with 'simple' (no stemming) to keep mixed Bengali/Latin
    // text tokenizing correctly. Using 'english' here silently
    // near-misses because the query stems words the tsvector didn't.
    query = query.textSearch("search_text", params.q, {
      type: "websearch",
      config: "simple",
    });
  }

  // Relevance sort only makes sense when there's a query. Silently
  // fall back to publication_desc if not.
  const effectiveSort: OpportunitySort =
    params.sort === "relevance" && !params.q?.trim()
      ? "publication_desc"
      : (params.sort ?? "publication_desc");

  switch (effectiveSort) {
    case "deadline_asc":
      query = query.order("deadline_at", {
        ascending: true,
        nullsFirst: false,
      });
      break;
    case "value_desc":
      query = query.order("estimated_value_max", {
        ascending: false,
        nullsFirst: false,
      });
      break;
    case "relevance":
      // supabase-js has no first-class ts_rank order; the textSearch
      // filter above already surfaces matches. We still add a stable
      // secondary order by publication_at desc so results are
      // deterministic. Proper ts_rank ordering will need an RPC —
      // captured as a Phase 3+ follow-up.
      query = query.order("publication_at", {
        ascending: false,
        nullsFirst: false,
      });
      break;
    case "publication_desc":
    default:
      query = query.order("publication_at", {
        ascending: false,
        nullsFirst: false,
      });
      break;
  }

  const { data, error } = await query.limit(limit);

  if (error) throw new Error(error.message);
  return (data as Opportunity[] | null) ?? [];
}
