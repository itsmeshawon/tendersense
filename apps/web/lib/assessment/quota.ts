/**
 * Assessment quota — 5/month free · unlimited Pro (Phase 4 §2f).
 *
 * Counter lives in `workspace_usage` keyed by (workspace_id,
 * period_month). Reads are RLS-open to members; writes are
 * service-role only, so `incrementUsage` must be called with an admin
 * client.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const FREE_MONTHLY_LIMIT = 5;

export type WorkspacePlan = "free" | "pro";

export interface UsageState {
  used: number;
  limit: number;
  remaining: number;
  unlimited: boolean;
  exhausted: boolean;
  periodMonth: string;
}

export function currentPeriodKey(now: Date = new Date()): string {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}-01`;
}

export async function getUsage(
  supabase: SupabaseClient,
  workspaceId: string,
  plan: WorkspacePlan,
  now: Date = new Date(),
): Promise<UsageState> {
  const period = currentPeriodKey(now);
  const { data, error } = await supabase
    .from("workspace_usage")
    .select("assessments_used")
    .eq("workspace_id", workspaceId)
    .eq("period_month", period)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const used = (data as { assessments_used: number } | null)?.assessments_used ?? 0;
  const unlimited = plan === "pro";
  const limit = unlimited ? Number.POSITIVE_INFINITY : FREE_MONTHLY_LIMIT;
  const remaining = unlimited
    ? Number.POSITIVE_INFINITY
    : Math.max(0, FREE_MONTHLY_LIMIT - used);
  return {
    used,
    limit,
    remaining,
    unlimited,
    exhausted: !unlimited && remaining <= 0,
    periodMonth: period,
  };
}

export async function incrementUsage(
  supabase: SupabaseClient,
  workspaceId: string,
  currentUsed: number,
  now: Date = new Date(),
): Promise<void> {
  const period = currentPeriodKey(now);
  const { error } = await supabase.from("workspace_usage").upsert(
    {
      workspace_id: workspaceId,
      period_month: period,
      assessments_used: currentUsed + 1,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,period_month" },
  );
  if (error) throw new Error(error.message);
}
