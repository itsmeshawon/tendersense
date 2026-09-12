import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  EvaluationStatus,
  RequirementCategory,
  RequirementThreshold,
} from "./types";

/** Mirror of `public.assessments` (migration 0020). */
export interface AssessmentRow {
  id: string;
  workspace_id: string;
  opportunity_id: string;
  status: "queued" | "running" | "succeeded" | "failed";
  eligibility:
    | "pass"
    | "partial"
    | "needs_verification"
    | "fail"
    | "not_evaluated"
    | null;
  eligibility_score: number | null;
  recommendation: "bid" | "verify" | "hold" | "skip" | null;
  recommendation_reason: string | null;
  summary: string | null;
  category_scores: Partial<Record<RequirementCategory, number>>;
  extraction_method: "rules" | "manual" | "mixed";
  extraction_meta: Record<string, unknown>;
  requested_by: string | null;
  requested_at: string;
  completed_at: string | null;
  scoring_version: number;
}

/** Mirror of `public.requirement_evaluations` (migration 0021). */
export interface EvaluationRow {
  id: string;
  requirement_id: string;
  status: EvaluationStatus;
  evidence_refs: unknown;
  reasoning: string | null;
  evaluated_at: string;
}

export async function getLatestAssessment(
  supabase: SupabaseClient,
  workspaceId: string,
  opportunityId: string,
): Promise<AssessmentRow | null> {
  const { data, error } = await supabase
    .from("assessments")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("opportunity_id", opportunityId)
    .eq("status", "succeeded")
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as AssessmentRow | null) ?? null;
}

export async function listEvaluationsForRequirements(
  supabase: SupabaseClient,
  requirementIds: string[],
): Promise<EvaluationRow[]> {
  if (requirementIds.length === 0) return [];
  const { data, error } = await supabase
    .from("requirement_evaluations")
    .select("*")
    .in("requirement_id", requirementIds);
  if (error) throw new Error(error.message);
  return (data as EvaluationRow[] | null) ?? [];
}

/** Mirror of `public.opportunity_requirements` (migration 0021). */
export interface RequirementRow {
  id: string;
  assessment_id: string;
  category: RequirementCategory;
  text: string;
  normalized_key: string | null;
  mandatory: boolean;
  threshold: RequirementThreshold | null;
  source_location: string | null;
  confidence: number | null;
  source: "rules" | "manual";
  created_at: string;
}

export async function listRequirements(
  supabase: SupabaseClient,
  assessmentId: string,
): Promise<RequirementRow[]> {
  const { data, error } = await supabase
    .from("opportunity_requirements")
    .select("*")
    .eq("assessment_id", assessmentId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as RequirementRow[] | null) ?? [];
}

export interface CreateManualRequirementInput {
  assessmentId: string;
  category: RequirementCategory;
  text: string;
  normalizedKey?: string | null;
  mandatory: boolean;
  threshold?: RequirementThreshold | null;
}

export async function createManualRequirement(
  supabase: SupabaseClient,
  input: CreateManualRequirementInput,
): Promise<RequirementRow> {
  const { data, error } = await supabase
    .from("opportunity_requirements")
    .insert({
      assessment_id: input.assessmentId,
      category: input.category,
      text: input.text.trim(),
      normalized_key: input.normalizedKey ?? null,
      mandatory: input.mandatory,
      threshold: input.threshold ?? null,
      source: "manual",
      confidence: 1,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as RequirementRow;
}

export interface UpdateRequirementInput {
  category?: RequirementCategory;
  text?: string;
  normalizedKey?: string | null;
  mandatory?: boolean;
  threshold?: RequirementThreshold | null;
}

export async function updateRequirement(
  supabase: SupabaseClient,
  id: string,
  patch: UpdateRequirementInput,
): Promise<void> {
  const update: Record<string, unknown> = {};
  if (patch.category !== undefined) update.category = patch.category;
  if (patch.text !== undefined) update.text = patch.text.trim();
  if (patch.normalizedKey !== undefined)
    update.normalized_key = patch.normalizedKey;
  if (patch.mandatory !== undefined) update.mandatory = patch.mandatory;
  if (patch.threshold !== undefined) update.threshold = patch.threshold;

  const { error } = await supabase
    .from("opportunity_requirements")
    .update(update)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
}

export async function deleteRequirement(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("opportunity_requirements")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateExtractionMethod(
  supabase: SupabaseClient,
  assessmentId: string,
  method: "rules" | "manual" | "mixed",
): Promise<void> {
  const { error } = await supabase
    .from("assessments")
    .update({ extraction_method: method })
    .eq("id", assessmentId)
    .select()
    .single();
  if (error) throw new Error(error.message);
}
