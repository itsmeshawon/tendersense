"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { upsertWorkforce } from "@/lib/workforce/repository";

function num(v: FormDataEntryValue | null): number | null {
  if (typeof v !== "string" || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

const ROLE_KEYS = [
  "engineers",
  "project_managers",
  "business_analysts",
  "ux_designers",
  "qa_engineers",
  "devops_engineers",
  "security_specialists",
  "data_engineers",
];

export async function saveWorkforceAction(
  workspaceId: string,
  formData: FormData,
): Promise<void> {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const totalEmployees = num(formData.get("total_employees"));
  const roleCounts: Record<string, number> = {};
  for (const key of ROLE_KEYS) {
    const v = num(formData.get(`role_${key}`));
    if (v !== null && v > 0) roleCounts[key] = v;
  }

  const supabase = await createServerSupabaseClient();
  await upsertWorkforce(supabase, workspaceId, user.id, {
    totalEmployees,
    roleCounts,
  });
  revalidatePath(`/workspaces/${workspaceId}/workforce`);
}
