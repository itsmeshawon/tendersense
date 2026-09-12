"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  createManualRequirement,
  deleteRequirement,
  updateExtractionMethod,
  updateRequirement,
  type UpdateRequirementInput,
} from "./repository";
import type { RequirementCategory } from "./types";
import { REQUIREMENT_CATEGORIES } from "./types";
import { nextExtractionMethodForManualAdd } from "./extractionMethod";
import { getUsage, incrementUsage, type WorkspacePlan } from "./quota";
import { runAssessment } from "./run";

export class QuotaExceededError extends Error {
  constructor(message = "Assessment quota exhausted for this month") {
    super(message);
    this.name = "QuotaExceededError";
  }
}

async function authorizeAssessment(assessmentId: string): Promise<{
  workspaceId: string;
  opportunityId: string;
  extractionMethod: "rules" | "manual" | "mixed";
}> {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("assessments")
    .select("workspace_id, opportunity_id, extraction_method")
    .eq("id", assessmentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Assessment not found or access denied");
  return {
    workspaceId: data.workspace_id as string,
    opportunityId: data.opportunity_id as string,
    extractionMethod: data.extraction_method as "rules" | "manual" | "mixed",
  };
}

function parseCategory(v: FormDataEntryValue | null): RequirementCategory {
  const s = String(v ?? "");
  return (REQUIREMENT_CATEGORIES as readonly string[]).includes(s)
    ? (s as RequirementCategory)
    : "other";
}

export async function addRequirementAction(
  assessmentId: string,
  formData: FormData,
): Promise<void> {
  const { workspaceId, opportunityId, extractionMethod } =
    await authorizeAssessment(assessmentId);

  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;
  const category = parseCategory(formData.get("category"));
  const mandatory = String(formData.get("mandatory") ?? "true") !== "false";
  const normalizedKey =
    String(formData.get("normalized_key") ?? "").trim() || null;

  const admin = createServiceRoleClient();
  await createManualRequirement(admin, {
    assessmentId,
    category,
    text,
    normalizedKey,
    mandatory,
  });

  const next = nextExtractionMethodForManualAdd(extractionMethod);
  if (next !== extractionMethod) {
    await updateExtractionMethod(admin, assessmentId, next);
  }

  revalidatePath(`/opportunities/${opportunityId}?workspace=${workspaceId}`);
}

export async function updateRequirementAction(
  assessmentId: string,
  requirementId: string,
  patch: UpdateRequirementInput,
): Promise<void> {
  const { workspaceId, opportunityId } = await authorizeAssessment(assessmentId);
  const admin = createServiceRoleClient();
  await updateRequirement(admin, requirementId, patch);
  revalidatePath(`/opportunities/${opportunityId}?workspace=${workspaceId}`);
}

/**
 * Trigger a synchronous assessment run. Enforces free-plan quota
 * server-side; throws `QuotaExceededError` on rejection so the caller
 * can surface plan-appropriate copy.
 */
export async function runAssessmentAction(
  workspaceId: string,
  opportunityId: string,
): Promise<{ assessmentId: string }> {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const supabase = await createServerSupabaseClient();
  const wsRes = await supabase
    .from("workspaces")
    .select("id, plan")
    .eq("id", workspaceId)
    .maybeSingle();
  if (wsRes.error) throw new Error(wsRes.error.message);
  const ws = wsRes.data as { id: string; plan: WorkspacePlan } | null;
  if (!ws) throw new Error("Workspace not found or access denied");

  const admin = createServiceRoleClient();
  const usage = await getUsage(admin, workspaceId, ws.plan);
  if (usage.exhausted) {
    throw new QuotaExceededError(
      `Free plan allows ${usage.limit} assessments per month. Upgrade to Pro for unlimited.`,
    );
  }

  const result = await runAssessment(admin, {
    workspaceId,
    opportunityId,
    requestedBy: user.id,
  });

  if (!usage.unlimited) {
    await incrementUsage(admin, workspaceId, usage.used);
  }

  revalidatePath(`/opportunities/${opportunityId}?workspace=${workspaceId}`);
  return { assessmentId: result.assessmentId };
}

export async function deleteRequirementAction(
  assessmentId: string,
  requirementId: string,
): Promise<void> {
  const { workspaceId, opportunityId } = await authorizeAssessment(assessmentId);
  const admin = createServiceRoleClient();
  await deleteRequirement(admin, requirementId);
  revalidatePath(`/opportunities/${opportunityId}?workspace=${workspaceId}`);
}
