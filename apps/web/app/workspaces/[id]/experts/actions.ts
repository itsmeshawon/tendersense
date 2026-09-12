"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createExpert,
  deleteExpert,
  type ExpertAvailability,
} from "@/lib/experts/repository";

function tokenize(v: FormDataEntryValue | null): string[] {
  if (typeof v !== "string") return [];
  return v
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function num(v: FormDataEntryValue | null): number | null {
  if (typeof v !== "string" || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export async function addExpertAction(
  workspaceId: string,
  formData: FormData,
): Promise<void> {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const availabilityRaw = String(formData.get("availability") ?? "").trim();
  const validAvailability: ExpertAvailability[] = [
    "full_time",
    "part_time",
    "short_term",
    "on_demand",
  ];
  const availability = validAvailability.includes(
    availabilityRaw as ExpertAvailability,
  )
    ? (availabilityRaw as ExpertAvailability)
    : null;

  const supabase = await createServerSupabaseClient();
  await createExpert(supabase, {
    workspaceId,
    createdBy: user.id,
    name,
    role: String(formData.get("role") ?? "").trim() || null,
    yearsExperience: num(formData.get("years_experience")),
    sectors: tokenize(formData.get("sectors")),
    availability,
  });
  revalidatePath(`/workspaces/${workspaceId}/experts`);
}

export async function removeExpertAction(
  workspaceId: string,
  id: string,
): Promise<void> {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const supabase = await createServerSupabaseClient();
  await deleteExpert(supabase, id);
  revalidatePath(`/workspaces/${workspaceId}/experts`);
}
