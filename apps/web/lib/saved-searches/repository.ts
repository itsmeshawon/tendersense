import type { SupabaseClient } from "@supabase/supabase-js";

/** Mirror of `public.saved_searches` (migration 0013). */
export type SavedSearch = {
  id: string;
  workspace_id: string;
  created_by: string;
  name: string;
  query_params: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export interface CreateSavedSearchInput {
  workspaceId: string;
  createdBy: string;
  name: string;
  queryParams: Record<string, unknown>;
}

export async function listSavedSearches(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<SavedSearch[]> {
  const { data, error } = await supabase
    .from("saved_searches")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as SavedSearch[] | null) ?? [];
}

export async function createSavedSearch(
  supabase: SupabaseClient,
  input: CreateSavedSearchInput,
): Promise<SavedSearch> {
  const { data, error } = await supabase
    .from("saved_searches")
    .insert({
      workspace_id: input.workspaceId,
      created_by: input.createdBy,
      name: input.name.trim(),
      query_params: input.queryParams,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as SavedSearch;
}

export async function deleteSavedSearch(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("saved_searches").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Serialize a query_params object back into a URL query string suitable
 * for `/opportunities?...`. Skips empty values so the URL stays clean.
 */
export function queryParamsToSearchString(
  params: Record<string, unknown>,
): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s.length === 0) continue;
    usp.set(k, s);
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}
