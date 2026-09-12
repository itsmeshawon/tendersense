import type { SupabaseClient } from "@supabase/supabase-js";

export type ExpertAvailability =
  | "full_time"
  | "part_time"
  | "short_term"
  | "on_demand";

export type ExpertRow = {
  id: string;
  workspace_id: string;
  name: string;
  role: string | null;
  years_experience: number | null;
  sectors: string[];
  availability: ExpertAvailability | null;
  cv_document_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export async function listExperts(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<ExpertRow[]> {
  const { data, error } = await supabase
    .from("workspace_experts")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as ExpertRow[] | null) ?? [];
}

export interface CreateExpertInput {
  workspaceId: string;
  createdBy: string;
  name: string;
  role?: string | null;
  yearsExperience?: number | null;
  sectors?: string[];
  availability?: ExpertAvailability | null;
}

export async function createExpert(
  supabase: SupabaseClient,
  input: CreateExpertInput,
): Promise<ExpertRow> {
  const { data, error } = await supabase
    .from("workspace_experts")
    .insert({
      workspace_id: input.workspaceId,
      created_by: input.createdBy,
      name: input.name.trim(),
      role: input.role ?? null,
      years_experience: input.yearsExperience ?? null,
      sectors: input.sectors ?? [],
      availability: input.availability ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as ExpertRow;
}

export async function deleteExpert(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("workspace_experts")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}
