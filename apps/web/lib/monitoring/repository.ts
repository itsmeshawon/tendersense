import type { SupabaseClient } from "@supabase/supabase-js";

/** Mirror of `public.monitoring_profiles` (migration 0012). */
export type MonitoringProfile = {
  id: string;
  workspace_id: string;
  created_by: string;
  name: string;
  is_active: boolean;
  country_codes: string[];
  source_keys: string[];
  sectors: string[];
  procurement_methods: string[];
  keywords: string[];
  excluded_keywords: string[];
  min_value: number | null;
  max_value: number | null;
  currency: string | null;
  min_days_remaining: number | null;
  created_at: string;
  updated_at: string;
};

export interface CreateMonitoringProfileInput {
  workspaceId: string;
  name: string;
  countryCodes?: string[];
  sourceKeys?: string[];
  sectors?: string[];
  procurementMethods?: string[];
  keywords?: string[];
  excludedKeywords?: string[];
  minValue?: number | null;
  maxValue?: number | null;
  currency?: string | null;
  minDaysRemaining?: number | null;
  isActive?: boolean;
}

/**
 * Free-plan gate error surfaced by the create_monitoring_profile RPC.
 * The RPC raises with prefix "MP_FREE_LIMIT:"; the repo converts to
 * this typed error so callers can render a specific UI.
 */
export class FreePlanLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FreePlanLimitError";
  }
}

export async function listMonitoringProfiles(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<MonitoringProfile[]> {
  const { data, error } = await supabase
    .from("monitoring_profiles")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as MonitoringProfile[] | null) ?? [];
}

export async function createMonitoringProfile(
  supabase: SupabaseClient,
  input: CreateMonitoringProfileInput,
): Promise<MonitoringProfile> {
  const { data, error } = await supabase.rpc("create_monitoring_profile", {
    p_workspace_id: input.workspaceId,
    p_name: input.name,
    p_country_codes: input.countryCodes ?? [],
    p_source_keys: input.sourceKeys ?? [],
    p_sectors: input.sectors ?? [],
    p_procurement_methods: input.procurementMethods ?? [],
    p_keywords: input.keywords ?? [],
    p_excluded_keywords: input.excludedKeywords ?? [],
    p_min_value: input.minValue ?? null,
    p_max_value: input.maxValue ?? null,
    p_currency: input.currency ?? null,
    p_min_days_remaining: input.minDaysRemaining ?? null,
    p_is_active: input.isActive ?? true,
  });
  if (error) {
    if (error.message.includes("MP_FREE_LIMIT")) {
      throw new FreePlanLimitError(
        "Free plan supports one active monitoring profile. Deactivate the existing profile, or upgrade to Pro for unlimited.",
      );
    }
    throw new Error(error.message);
  }
  return data as MonitoringProfile;
}

export async function setMonitoringProfileActive(
  supabase: SupabaseClient,
  profileId: string,
  isActive: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("monitoring_profiles")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", profileId);
  if (error) throw new Error(error.message);
}

export async function deleteMonitoringProfile(
  supabase: SupabaseClient,
  profileId: string,
): Promise<void> {
  const { error } = await supabase
    .from("monitoring_profiles")
    .delete()
    .eq("id", profileId);
  if (error) throw new Error(error.message);
}
