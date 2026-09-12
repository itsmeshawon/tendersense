import Link from "next/link";
import { Bell } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { countUnreadForBell } from "@/lib/notifications/repository";
import { listMyWorkspaces } from "@/lib/workspaces/service";

/**
 * Server component. Renders a link to /notifications with the unread
 * count from the user's primary workspace (last 30 days).
 * Returns null when there are no workspaces yet.
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
      aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
      className="relative grid size-8 place-items-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-accent"
    >
      <Bell className="size-4" aria-hidden />
      {unread > 0 ? (
        <span
          aria-hidden
          className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-4 text-white"
        >
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
