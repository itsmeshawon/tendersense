import type { SupabaseClient } from "@supabase/supabase-js";

export type CredentialType =
  | "iso"
  | "cmmi"
  | "business_license"
  | "tax_registration"
  | "professional_accreditation"
  | "technology_partnership"
  | "membership"
  | "security"
  | "award"
  | "other";

export type CredentialStatus = "valid" | "expired" | "revoked";

export type CredentialRow = {
  id: string;
  workspace_id: string;
  credential_type: CredentialType;
  name: string;
  issuer: string | null;
  credential_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  status: CredentialStatus;
  country_code: string | null;
  evidence_document_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export const CREDENTIAL_TYPE_LABEL: Record<CredentialType, string> = {
  iso: "ISO Certification",
  cmmi: "CMMI",
  business_license: "Business licence",
  tax_registration: "Tax registration",
  professional_accreditation: "Professional accreditation",
  technology_partnership: "Technology partnership",
  membership: "Industry membership",
  security: "Security certification",
  award: "Award",
  other: "Other",
};

export async function listCredentials(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<CredentialRow[]> {
  const { data, error } = await supabase
    .from("workspace_credentials")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("expiry_date", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data as CredentialRow[] | null) ?? [];
}

export interface CreateCredentialInput {
  workspaceId: string;
  createdBy: string;
  type: CredentialType;
  name: string;
  issuer?: string | null;
  credentialNumber?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  countryCode?: string | null;
}

export async function createCredential(
  supabase: SupabaseClient,
  input: CreateCredentialInput,
): Promise<CredentialRow> {
  const { data, error } = await supabase
    .from("workspace_credentials")
    .insert({
      workspace_id: input.workspaceId,
      created_by: input.createdBy,
      credential_type: input.type,
      name: input.name.trim(),
      issuer: input.issuer ?? null,
      credential_number: input.credentialNumber ?? null,
      issue_date: input.issueDate ?? null,
      expiry_date: input.expiryDate ?? null,
      country_code: input.countryCode ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as CredentialRow;
}

export async function updateCredentialStatus(
  supabase: SupabaseClient,
  id: string,
  status: CredentialStatus,
): Promise<void> {
  const { error } = await supabase
    .from("workspace_credentials")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteCredential(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("workspace_credentials")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}
