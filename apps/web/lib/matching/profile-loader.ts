import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkspaceProfile } from "./types";
import { normalizedKeyForCredential } from "@/lib/assessment/snapshot";

/**
 * Compose a WorkspaceProfile from the three DB sources that feed
 * matching:
 *   - monitoring_profiles (active only): countries, sectors, keywords, exclusions
 *   - workspace_capabilities: capability labels
 *   - projects: past-project titles
 *
 * Fields are deduped across active monitoring profiles (§2 AND across
 * dimensions, but the union across profiles is what the workspace as
 * a whole "cares about" — this is a Phase 3 v2 design decision).
 */
export async function loadWorkspaceProfile(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<WorkspaceProfile> {
  const [profRes, capRes, projRes, credRes] = await Promise.all([
    supabase.from("monitoring_profiles").select("*").eq("workspace_id", workspaceId),
    supabase.from("workspace_capabilities").select("*").eq("workspace_id", workspaceId),
    supabase.from("projects").select("*").eq("workspace_id", workspaceId),
    supabase
      .from("workspace_credentials")
      .select("credential_type, name, credential_number, status")
      .eq("workspace_id", workspaceId),
  ]);

  if (profRes.error) throw new Error(profRes.error.message);
  if (capRes.error) throw new Error(capRes.error.message);
  if (projRes.error) throw new Error(projRes.error.message);
  if (credRes.error) throw new Error(credRes.error.message);

  const profiles = (profRes.data as MonitoringProfileRow[] | null) ?? [];
  const caps = (capRes.data as CapabilityRow[] | null) ?? [];
  const projects = (projRes.data as ProjectRow[] | null) ?? [];
  const credentials =
    (credRes.data as
      | Array<{
          credential_type: string;
          name: string;
          credential_number: string | null;
          status: "valid" | "expired" | "revoked";
        }>
      | null) ?? [];

  const countries = new Set<string>();
  const sectors = new Set<string>();
  const keywords = new Set<string>();
  const excludedKeywords = new Set<string>();

  for (const p of profiles) {
    if (!p.is_active) continue;
    for (const c of p.country_codes ?? []) countries.add(c);
    for (const s of p.sectors ?? []) sectors.add(s);
    for (const k of p.keywords ?? []) keywords.add(k);
    for (const x of p.excluded_keywords ?? []) excludedKeywords.add(x);
  }

  const credentialKeys = Array.from(
    new Set(
      credentials
        .filter((c) => c.status === "valid")
        .map((c) => normalizedKeyForCredential(c))
        .filter((k): k is string => Boolean(k)),
    ),
  );

  return {
    workspaceId,
    capabilities: caps.map((c) => c.label),
    sectors: Array.from(sectors),
    countries: Array.from(countries),
    keywords: Array.from(keywords),
    excludedKeywords: Array.from(excludedKeywords),
    projectTitles: projects.map((p) => p.name),
    credentialKeys,
  };
}

interface MonitoringProfileRow {
  workspace_id: string;
  is_active: boolean;
  country_codes: string[] | null;
  sectors: string[] | null;
  keywords: string[] | null;
  excluded_keywords: string[] | null;
}
interface CapabilityRow {
  workspace_id: string;
  label: string;
}
interface ProjectRow {
  workspace_id: string;
  name: string;
}
