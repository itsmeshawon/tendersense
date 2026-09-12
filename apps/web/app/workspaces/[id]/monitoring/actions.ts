"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createMonitoringProfile,
  deleteMonitoringProfile,
  FreePlanLimitError,
  setMonitoringProfileActive,
} from "@/lib/monitoring/repository";
import { recomputeForWorkspace } from "@/lib/matching/recompute";

export type CreateMonitoringProfileState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "created"; profileId: string };

function tokenize(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function numberOrNull(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function createProfileAction(
  workspaceId: string,
  _prev: CreateMonitoringProfileState,
  formData: FormData,
): Promise<CreateMonitoringProfileState> {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { status: "error", message: "Name is required" };

  const supabase = await createServerSupabaseClient();

  try {
    const profile = await createMonitoringProfile(supabase, {
      workspaceId,
      name,
      countryCodes: tokenize(formData.get("country_codes")),
      sourceKeys: tokenize(formData.get("source_keys")),
      sectors: tokenize(formData.get("sectors")),
      procurementMethods: tokenize(formData.get("procurement_methods")),
      keywords: tokenize(formData.get("keywords")),
      excludedKeywords: tokenize(formData.get("excluded_keywords")),
      minValue: numberOrNull(formData.get("min_value")),
      maxValue: numberOrNull(formData.get("max_value")),
      currency: (formData.get("currency") as string) || null,
      minDaysRemaining: numberOrNull(formData.get("min_days_remaining")),
      isActive: formData.get("is_active") === "on",
    });
    revalidatePath(`/workspaces/${workspaceId}/monitoring`);
    // Fire-and-log: rescore last-90d opportunities against the new
    // profile so /opportunities shows grades on next visit.
    try {
      await recomputeForWorkspace(supabase, workspaceId);
    } catch (recomputeErr) {
      console.warn(
        "[monitoring] recompute after create failed:",
        recomputeErr instanceof Error ? recomputeErr.message : recomputeErr,
      );
    }
    return { status: "created", profileId: profile.id };
  } catch (err) {
    if (err instanceof FreePlanLimitError) {
      return { status: "error", message: err.message };
    }
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Failed to create profile",
    };
  }
}

export async function toggleProfileActiveAction(
  workspaceId: string,
  profileId: string,
  isActive: boolean,
): Promise<void> {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const supabase = await createServerSupabaseClient();
  await setMonitoringProfileActive(supabase, profileId, isActive);
  revalidatePath(`/workspaces/${workspaceId}/monitoring`);
  try {
    await recomputeForWorkspace(supabase, workspaceId);
  } catch (err) {
    console.warn(
      "[monitoring] recompute after toggle failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

export async function deleteProfileAction(
  workspaceId: string,
  profileId: string,
): Promise<void> {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const supabase = await createServerSupabaseClient();
  await deleteMonitoringProfile(supabase, profileId);
  revalidatePath(`/workspaces/${workspaceId}/monitoring`);
  try {
    await recomputeForWorkspace(supabase, workspaceId);
  } catch (err) {
    console.warn(
      "[monitoring] recompute after delete failed:",
      err instanceof Error ? err.message : err,
    );
  }
}
