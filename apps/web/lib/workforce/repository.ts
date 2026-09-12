import type { SupabaseClient } from "@supabase/supabase-js";

export type WorkforceRow = {
  workspace_id: string;
  total_employees: number | null;
  role_counts: Record<string, number>;
  updated_by: string | null;
  updated_at: string;
};

export async function getWorkforce(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<WorkforceRow | null> {
  const { data, error } = await supabase
    .from("workspace_workforce")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as WorkforceRow | null) ?? null;
}

export interface UpsertWorkforceInput {
  totalEmployees?: number | null;
  roleCounts?: Record<string, number>;
}

export async function upsertWorkforce(
  supabase: SupabaseClient,
  workspaceId: string,
  updatedBy: string,
  input: UpsertWorkforceInput,
): Promise<WorkforceRow> {
  const { data, error } = await supabase
    .from("workspace_workforce")
    .upsert(
      {
        workspace_id: workspaceId,
        total_employees: input.totalEmployees ?? null,
        role_counts: input.roleCounts ?? {},
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id" },
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as WorkforceRow;
}
