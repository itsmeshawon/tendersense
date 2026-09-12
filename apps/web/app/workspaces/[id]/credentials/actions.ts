"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createCredential,
  deleteCredential,
  updateCredentialStatus,
  type CredentialType,
  type CredentialStatus,
} from "@/lib/credentials/repository";

export async function addCredentialAction(
  workspaceId: string,
  formData: FormData,
): Promise<void> {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const type = (formData.get("type") as CredentialType) || "other";
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const issuer = String(formData.get("issuer") ?? "").trim() || null;
  const number = String(formData.get("credential_number") ?? "").trim() || null;
  const issueDate = String(formData.get("issue_date") ?? "").trim() || null;
  const expiryDate = String(formData.get("expiry_date") ?? "").trim() || null;
  const countryCode =
    String(formData.get("country_code") ?? "").trim() || null;

  const supabase = await createServerSupabaseClient();
  await createCredential(supabase, {
    workspaceId,
    createdBy: user.id,
    type,
    name,
    issuer,
    credentialNumber: number,
    issueDate,
    expiryDate,
    countryCode,
  });
  revalidatePath(`/workspaces/${workspaceId}/credentials`);
}

export async function setCredentialStatusAction(
  workspaceId: string,
  id: string,
  status: CredentialStatus,
): Promise<void> {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const supabase = await createServerSupabaseClient();
  await updateCredentialStatus(supabase, id, status);
  revalidatePath(`/workspaces/${workspaceId}/credentials`);
}

export async function removeCredentialAction(
  workspaceId: string,
  id: string,
): Promise<void> {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const supabase = await createServerSupabaseClient();
  await deleteCredential(supabase, id);
  revalidatePath(`/workspaces/${workspaceId}/credentials`);
}
