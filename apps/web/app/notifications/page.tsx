import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listMyWorkspaces } from "@/lib/workspaces/service";
import { listNotifications } from "@/lib/notifications/repository";
import { NotificationItem } from "./notification-item";
import { MarkAllRead } from "./mark-all-read";

const DHAKA_DATE = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Dhaka",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function fmt(iso: string) {
  try {
    return DHAKA_DATE.format(new Date(iso));
  } catch {
    return iso;
  }
}

export default async function NotificationsPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const workspaces = await listMyWorkspaces();
  if (workspaces.length === 0) redirect("/workspaces/new");
  const primary = workspaces[0];

  const supabase = await createServerSupabaseClient();
  const rows = await listNotifications(supabase, primary.id, 200);
  const unreadCount = rows.filter((r) => r.read_at === null).length;

  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {primary.name} · {rows.length} total · {unreadCount} unread
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 ? <MarkAllRead workspaceId={primary.id} /> : null}
          <Link
            href="/dashboard"
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-sm text-muted-foreground">
          No notifications yet. Set up a{" "}
          <Link
            href={`/workspaces/${primary.id}/monitoring`}
            className="underline hover:text-foreground"
          >
            monitoring profile
          </Link>{" "}
          — you&rsquo;ll get pinged here when a matching tender is amended.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((n) => (
            <NotificationItem key={n.id} n={n} formatDate={fmt} />
          ))}
        </ul>
      )}
    </main>
  );
}
