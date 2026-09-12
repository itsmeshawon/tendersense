"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  deleteWorkspaceCapability,
  upsertWorkspaceCapabilities,
} from "@/lib/matching/repository";
import { recomputeForWorkspace } from "@/lib/matching/recompute";
import { CAPABILITY_TAXONOMY } from "@/lib/matching/taxonomy";

export async function addCapabilityAction(
  workspaceId: string,
  label: string,
): Promise<void> {
  const user = await getServerUser();
  if (!user) redirect("/login");

  // Guard: label must be one of the taxonomy keys (SoT §16.7 fixed set,
  // Phase 3 v2 §Q1 decision — no custom until Pro).
  if (!CAPABILITY_TAXONOMY.some((c) => c.key === label)) {
    throw new Error(`Unknown capability: ${label}`);
  }

  const supabase = await createServerSupabaseClient();
  await upsertWorkspaceCapabilities(supabase, workspaceId, [
    { label, source: "user" },
  ]);
  revalidatePath(`/workspaces/${workspaceId}/capabilities`);

  // Recompute — service-role bypass because opportunity_matches
  // insert/update is granted only to service_role.
  try {
    const admin = createServiceRoleClient();
    await recomputeForWorkspace(admin, workspaceId);
  } catch (err) {
    console.warn(
      "[capabilities] recompute after add failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * Promote a suggested (auto_derived) capability to confirmed (user).
 * Same row; only the source field flips.
 */
export async function confirmCapabilityAction(
  workspaceId: string,
  label: string,
): Promise<void> {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const supabase = await createServerSupabaseClient();
  await upsertWorkspaceCapabilities(supabase, workspaceId, [
    { label, source: "user" },
  ]);
  revalidatePath(`/workspaces/${workspaceId}/capabilities`);
}

export async function removeCapabilityAction(
  workspaceId: string,
  capabilityId: string,
): Promise<void> {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const supabase = await createServerSupabaseClient();
  await deleteWorkspaceCapability(supabase, capabilityId);
  revalidatePath(`/workspaces/${workspaceId}/capabilities`);

  try {
    const admin = createServiceRoleClient();
    await recomputeForWorkspace(admin, workspaceId);
  } catch (err) {
    console.warn(
      "[capabilities] recompute after remove failed:",
      err instanceof Error ? err.message : err,
    );
  }
}
