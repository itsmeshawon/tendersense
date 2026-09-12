import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationKind = "amendment" | "new_match" | "deadline_soon";

/** Mirror of `public.notifications` (migration 0014). */
export type NotificationRow = {
  id: string;
  workspace_id: string;
  user_id: string | null;
  kind: NotificationKind;
  opportunity_id: string | null;
  revision_id: string | null;
  title: string;
  body: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

/** How far back the bell shows. Phase 2 v2 §Q5 decision. */
export const BELL_LOOKBACK_DAYS = 30;

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Full notifications list for /notifications (permanent audit view).
 */
export async function listNotifications(
  supabase: SupabaseClient,
  workspaceId: string,
  limit = 100,
): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data as NotificationRow[] | null) ?? [];
}

/**
 * Recent notifications for the bell dropdown. Capped by BELL_LOOKBACK_DAYS.
 */
export async function listBellNotifications(
  supabase: SupabaseClient,
  workspaceId: string,
  limit = 8,
): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("workspace_id", workspaceId)
    .gte("created_at", daysAgoIso(BELL_LOOKBACK_DAYS))
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data as NotificationRow[] | null) ?? [];
}

/**
 * Head count of unread notifications in the last 30 days for the
 * bell badge.
 */
export async function countUnreadForBell(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .gte("created_at", daysAgoIso(BELL_LOOKBACK_DAYS))
    .is("read_at", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function markNotificationRead(
  supabase: SupabaseClient,
  notificationId: string,
): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId);
  if (error) throw new Error(error.message);
}

export async function markAllReadForWorkspace(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .is("read_at", null);
  if (error) throw new Error(error.message);
}

export interface InsertNotificationInput {
  workspaceId: string;
  kind: NotificationKind;
  opportunityId?: string;
  revisionId?: string;
  title: string;
  body?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Insert one notification row. Service-role only in production
 * (client-side inserts are ungranted — see migration 0014).
 */
export async function insertNotification(
  supabase: SupabaseClient,
  input: InsertNotificationInput,
): Promise<void> {
  const { error } = await supabase.from("notifications").insert({
    workspace_id: input.workspaceId,
    kind: input.kind,
    opportunity_id: input.opportunityId ?? null,
    revision_id: input.revisionId ?? null,
    title: input.title,
    body: input.body ?? null,
    metadata: input.metadata ?? {},
  });
  if (error) throw new Error(error.message);
}
