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

export interface ListOpportunitiesParams {
  limit?: number;
}

export async function listOpportunities(
  supabase: SupabaseClient,
  params: ListOpportunitiesParams = {},
): Promise<Opportunity[]> {
  const limit = Math.min(params.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .order("publication_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data as Opportunity[] | null) ?? [];
}
