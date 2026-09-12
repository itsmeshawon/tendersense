import type { SupabaseClient } from "@supabase/supabase-js";

/** Mirror of `public.projects` (migration 0011). */
export type ProjectRow = {
  id: string;
  workspace_id: string;
  name: string;
  client_name: string | null;
  country_code: string | null;
  sector: string | null;
  start_date: string | null;
  end_date: string | null;
  contract_value: number | null;
  currency: string | null;
  summary: string | null;
  services: string[] | null;
  technologies: string[] | null;
  evidence_credential_number: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Input shape for inserting new projects.
 *
 * Only workspace_id and name are required; every other column has a DB
 * default, accepts null, or gets populated by the map function.
 */
export type ProjectInsert = Partial<
  Omit<ProjectRow, "id" | "created_at" | "updated_at" | "workspace_id" | "name">
> & {
  workspace_id: string;
  name: string;
};

export async function listWorkspaceProjects(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<ProjectRow[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("end_date", { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data as ProjectRow[] | null) ?? [];
}

/**
 * Batch-insert projects. Returns the count of rows inserted.
 * RLS policy `projects_member_insert` (migration 0011) enforces that
 * only workspace members can insert.
 */
export async function insertProjects(
  supabase: SupabaseClient,
  rows: ProjectInsert[],
): Promise<number> {
  if (rows.length === 0) return 0;
  const { error } = await supabase.from("projects").insert(rows);
  if (error) throw new Error(error.message);
  return rows.length;
}
