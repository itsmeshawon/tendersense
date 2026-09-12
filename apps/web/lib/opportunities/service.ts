import { createServerSupabaseClient } from "../supabase/server";
import {
  listOpportunities,
  type ListOpportunitiesParams,
  type Opportunity,
} from "./repository";

/**
 * Read-only list of ingested procurement opportunities.
 *
 * RLS policy `opportunities_authenticated_select` (migration 0009) makes
 * every authenticated user able to see every row — this table is public
 * procurement info (SoT §17 exception). No workspace scoping.
 */
export async function listPublicOpportunities(
  params: ListOpportunitiesParams = {},
): Promise<Opportunity[]> {
  const supabase = await createServerSupabaseClient();
  return listOpportunities(supabase, params);
}
