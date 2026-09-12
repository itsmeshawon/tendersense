"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  markAllReadForWorkspace,
  markNotificationRead,
} from "@/lib/notifications/repository";

export async function markReadAction(id: string): Promise<void> {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const supabase = await createServerSupabaseClient();
  await markNotificationRead(supabase, id);
  revalidatePath("/notifications");
}

export async function markAllReadAction(workspaceId: string): Promise<void> {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const supabase = await createServerSupabaseClient();
  await markAllReadForWorkspace(supabase, workspaceId);
  revalidatePath("/notifications");
}
