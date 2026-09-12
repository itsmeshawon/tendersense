import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listMyWorkspaces } from "@/lib/workspaces/service";
import { listRecentRevisions } from "@/lib/revisions/repository";
import { listOpportunities } from "@/lib/opportunities/repository";
import { listMonitoringProfiles } from "@/lib/monitoring/repository";

const DHAKA_DATE = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Dhaka",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return DHAKA_DATE.format(new Date(iso));
  } catch {
    return iso;
  }
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.round((then - Date.now()) / (1000 * 60 * 60 * 24));
}

export default async function DashboardPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const workspaces = await listMyWorkspaces();
  if (workspaces.length === 0) redirect("/workspaces/new");

  const primary = workspaces[0];
  const supabase = await createServerSupabaseClient();

  const [recentRevisions, upcoming, profiles] = await Promise.all([
    listRecentRevisions(supabase, 7, 10),
    listOpportunities(supabase, {
      status: "open",
      deadlineWithinDays: 14,
      limit: 8,
      sort: "deadline_asc",
    }),
    listMonitoringProfiles(supabase, primary.id),
  ]);

  const activeProfile = profiles.find((p) => p.is_active);

  return (
    <main className="mx-auto flex min-h-svh max-w-4xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {primary.name} · {primary.plan}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/opportunities"
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
          >
            Opportunities
          </Link>
          <Link
            href="/workspaces"
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
          >
            Workspaces
          </Link>
        </div>
      </header>

      <section className="flex flex-col gap-3 rounded-md border p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recent amendments (last 7 days)
          </h2>
          <Link
            href="/opportunities"
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            All opportunities →
          </Link>
        </div>
        {recentRevisions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No amendments in the last 7 days.
          </p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {recentRevisions.map((r) => {
              const deadlineChange = r.changed_fields.includes("deadline_at");
              return (
                <li
                  key={r.id}
                  className="flex items-baseline justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{r.opportunity?.title ?? "—"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.opportunity?.source_key} · Rev {r.revision_no} ·{" "}
                      {fmt(r.detected_at)}
                    </p>
                  </div>
                  <span
                    className={
                      deadlineChange
                        ? "shrink-0 rounded-full border border-red-600 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
                        : "shrink-0 rounded-full border px-2 py-0.5 text-xs text-muted-foreground"
                    }
                  >
                    {deadlineChange ? "Deadline changed" : "Amended"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-md border p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Upcoming deadlines (next 14 days)
          </h2>
          {activeProfile ? (
            <Link
              href={`/workspaces/${primary.id}/monitoring`}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              Profile: {activeProfile.name} →
            </Link>
          ) : (
            <Link
              href={`/workspaces/${primary.id}/monitoring`}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              Set up a monitoring profile →
            </Link>
          )}
        </div>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing closes in the next 14 days.
          </p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {upcoming.map((o) => {
              const days = daysUntil(o.deadline_at);
              return (
                <li
                  key={o.id}
                  className="flex items-baseline justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{o.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {o.source_key} · {o.country_name ?? o.country_code ?? "—"}
                    </p>
                  </div>
                  <span
                    className={
                      days !== null && days < 7
                        ? "shrink-0 text-xs font-medium text-red-600 dark:text-red-400"
                        : "shrink-0 text-xs text-muted-foreground"
                    }
                  >
                    {fmt(o.deadline_at)}
                    {days !== null ? ` (${days}d)` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-md border p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Assessment usage
        </h2>
        <p className="text-sm text-muted-foreground">
          Assessment lands in Phase 4 — deep qualification against selected
          opportunities with LLM-based requirement extraction and a per-plan
          quota.
        </p>
      </section>
    </main>
  );
}
