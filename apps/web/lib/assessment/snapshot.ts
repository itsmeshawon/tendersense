import type { SupabaseClient } from "@supabase/supabase-js";
import { extractRequirements } from "./rulesExtractor";
import type { WorkspaceSnapshot } from "./evaluate";

interface CredentialRowLite {
  credential_type: string;
  name: string;
  credential_number: string | null;
  status?: "valid" | "expired" | "revoked";
  expiry_date?: string | null;
  id?: string;
}

/**
 * Derive the assessment engine's `normalizedKey` for a credential row.
 * ISO/CMMI have hard-coded shortcuts; everything else falls back to
 * running the rules extractor over the row's name + number.
 */
export function normalizedKeyForCredential(
  row: CredentialRowLite,
): string | null {
  if (row.credential_type === "iso" && row.credential_number) {
    return `iso_${row.credential_number}`;
  }
  if (row.credential_type === "cmmi") {
    return "cmmi_dev";
  }
  const probe = `${row.name} ${row.credential_number ?? ""}`.trim();
  const hits = extractRequirements(probe);
  return hits[0]?.normalizedKey ?? null;
}

export async function loadWorkspaceSnapshot(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<WorkspaceSnapshot> {
  const [wsRes, credRes, projRes, finRes, wfRes] = await Promise.all([
    supabase
      .from("workspaces")
      .select("country_code")
      .eq("id", workspaceId)
      .maybeSingle(),
    supabase
      .from("workspace_credentials")
      .select("*")
      .eq("workspace_id", workspaceId),
    supabase.from("projects").select("*").eq("workspace_id", workspaceId),
    supabase
      .from("workspace_financials")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("fiscal_year", { ascending: false }),
    supabase
      .from("workspace_workforce")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
  ]);

  const ws = (wsRes.data as { country_code: string | null } | null) ?? null;
  const creds = (credRes.data as CredentialRowLite[] | null) ?? [];
  const projects =
    (projRes.data as
      | Array<{ id: string; name: string; sector: string | null }>
      | null) ?? [];
  const financials =
    (finRes.data as
      | Array<{ annual_turnover: number | null; is_audited: boolean }>
      | null) ?? [];
  const wf =
    (wfRes.data as { total_employees: number | null } | null) ?? null;

  return {
    countryCode: ws?.country_code ?? null,
    credentials: creds.map((c) => ({
      id: c.id,
      normalizedKey: normalizedKeyForCredential(c),
      name: c.name,
      status: c.status ?? "valid",
      expiryDate: c.expiry_date ?? null,
    })),
    pastProjects: projects.map((p) => ({
      id: p.id,
      title: p.name,
      sector: p.sector,
    })),
    financials: financials[0]
      ? {
          annualRevenue: financials[0].annual_turnover,
          hasAudited: financials[0].is_audited,
        }
      : null,
    workforce: wf ? { totalEmployees: wf.total_employees } : null,
  };
}
