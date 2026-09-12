import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { countUnreadForBell } from "@/lib/notifications/repository";
import { listMyWorkspaces } from "@/lib/workspaces/service";

/**
 * Server component. Renders a link to /notifications with the unread
 * count from the user's primary workspace (last 30 days).
 * Falls back to a plain link if the user has no workspace.
 */
export async function NotificationsBell() {
  const workspaces = await listMyWorkspaces();
  if (workspaces.length === 0) return null;

  const primary = workspaces[0];
  const supabase = await createServerSupabaseClient();
  let unread = 0;
  try {
    unread = await countUnreadForBell(supabase, primary.id);
  } catch {
    // Non-fatal — bell just shows without a badge.
  }

  return (
    <Link
      href="/notifications"
      aria-label={`Notifications (${unread} unread)`}
      className="relative inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
    >
      <span>🔔</span>
      {unread > 0 ? (
        <span className="rounded-full bg-red-600 px-1.5 text-xs font-medium text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
