import type { SupabaseClient } from "@supabase/supabase-js";
import type { Grade, MatchReason } from "./types";

/** Mirror of `public.opportunity_matches` (migration 0018). */
export type OpportunityMatchRow = {
  id: string;
  workspace_id: string;
  opportunity_id: string;
  score: number;
  grade: Grade;
  reasons: MatchReason[];
  concerns: MatchReason[];
  scoring_version: number;
  computed_at: string;
};

/** Mirror of `public.workspace_capabilities` (migration 0019). */
export type WorkspaceCapabilityRow = {
  id: string;
  workspace_id: string;
  label: string;
  source: "user" | "auto_derived";
  confidence: number | null;
  created_at: string;
  updated_at: string;
};

export async function listMatchesForWorkspace(
  supabase: SupabaseClient,
  workspaceId: string,
  limit = 200,
): Promise<OpportunityMatchRow[]> {
  const { data, error } = await supabase
    .from("opportunity_matches")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("score", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data as OpportunityMatchRow[] | null) ?? []).slice(0, limit);
}

export async function listMatchesByIds(
  supabase: SupabaseClient,
  workspaceId: string,
  opportunityIds: string[],
): Promise<OpportunityMatchRow[]> {
  if (opportunityIds.length === 0) return [];
  const { data, error } = await supabase
    .from("opportunity_matches")
    .select("*")
    .eq("workspace_id", workspaceId)
    .in("opportunity_id", opportunityIds);
  if (error) throw new Error(error.message);
  return (data as OpportunityMatchRow[] | null) ?? [];
}

export interface UpsertMatchInput {
  workspaceId: string;
  opportunityId: string;
  score: number;
  grade: Grade;
  reasons: MatchReason[];
  concerns: MatchReason[];
  scoringVersion: number;
}

export async function upsertMatch(
  supabase: SupabaseClient,
  input: UpsertMatchInput,
): Promise<void> {
  const { error } = await supabase.from("opportunity_matches").upsert(
    {
      workspace_id: input.workspaceId,
      opportunity_id: input.opportunityId,
      score: input.score,
      grade: input.grade,
      reasons: input.reasons,
      concerns: input.concerns,
      scoring_version: input.scoringVersion,
      computed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,opportunity_id" },
  );
  if (error) throw new Error(error.message);
}

/**
 * Bulk-upsert. Cuts N round-trips to 1 at the cost of losing per-row
 * error reporting. Used by recomputeForWorkspace to avoid a slow
 * loop when scoring hundreds of opportunities.
 */
export async function upsertMatchesBulk(
  supabase: SupabaseClient,
  inputs: UpsertMatchInput[],
): Promise<void> {
  if (inputs.length === 0) return;
  const now = new Date().toISOString();
  const rows = inputs.map((input) => ({
    workspace_id: input.workspaceId,
    opportunity_id: input.opportunityId,
    score: input.score,
    grade: input.grade,
    reasons: input.reasons,
    concerns: input.concerns,
    scoring_version: input.scoringVersion,
    computed_at: now,
    updated_at: now,
  }));
  const { error } = await supabase
    .from("opportunity_matches")
    .upsert(rows, { onConflict: "workspace_id,opportunity_id" });
  if (error) throw new Error(error.message);
}

export async function listWorkspaceCapabilities(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<WorkspaceCapabilityRow[]> {
  const { data, error } = await supabase
    .from("workspace_capabilities")
    .select("*")
    .eq("workspace_id", workspaceId);
  if (error) throw new Error(error.message);
  return (data as WorkspaceCapabilityRow[] | null) ?? [];
}

export interface CapabilityUpsertInput {
  label: string;
  source: "user" | "auto_derived";
  confidence?: number;
}

export async function upsertWorkspaceCapabilities(
  supabase: SupabaseClient,
  workspaceId: string,
  caps: CapabilityUpsertInput[],
): Promise<void> {
  if (caps.length === 0) return;
  const rows = caps.map((c) => ({
    workspace_id: workspaceId,
    label: c.label,
    source: c.source,
    confidence: c.confidence ?? null,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase
    .from("workspace_capabilities")
    .upsert(rows, { onConflict: "workspace_id,label" });
  if (error) throw new Error(error.message);
}

export async function deleteWorkspaceCapability(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("workspace_capabilities")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}
