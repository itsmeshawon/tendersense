import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listMyWorkspaces } from "@/lib/workspaces/service";
import { NotificationsBell } from "@/components/NotificationsBell";
import { listRecentRevisions } from "@/lib/revisions/repository";
import { listOpportunities } from "@/lib/opportunities/repository";
import { listMonitoringProfiles } from "@/lib/monitoring/repository";
import { listRecommendedMatches } from "@/lib/matching/repository";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

  const [recentRevisions, upcoming, profiles, recommended] = await Promise.all([
    listRecentRevisions(supabase, 7, 10),
    listOpportunities(supabase, {
      status: "open",
      deadlineWithinDays: 14,
      limit: 8,
      sort: "deadline_asc",
    }),
    listMonitoringProfiles(supabase, primary.id),
    listRecommendedMatches(supabase, primary.id, 5),
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
          <NotificationsBell />
          <Link href="/opportunities">
            <Button variant="outline" size="sm">
              Opportunities
            </Button>
          </Link>
          <Link href="/workspaces">
            <Button variant="outline" size="sm">
              Workspaces
            </Button>
          </Link>
        </div>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-baseline justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Recommended for you ({recommended.length})
            </CardTitle>
            <Link
              href={`/opportunities?workspace=${primary.id}&sort=grade_desc`}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              See all →
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {recommended.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No A or B fits yet. Adjust your{" "}
              <Link
                href={`/workspaces/${primary.id}/monitoring`}
                className="underline hover:text-foreground"
              >
                monitoring profile
              </Link>{" "}
              or{" "}
              <Link
                href={`/workspaces/${primary.id}/capabilities`}
                className="underline hover:text-foreground"
              >
                capabilities
              </Link>
              — grades recompute automatically.
            </p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {recommended.map((r) => (
                <li key={r.id} className="flex items-baseline justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/opportunities/${r.opportunity_id}?workspace=${primary.id}`}
                      className="truncate hover:underline"
                    >
                      {r.opportunity?.title ?? "—"}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.opportunity?.source_key} ·{" "}
                      {r.opportunity?.country_name ?? "—"}
                    </p>
                  </div>
                  <Badge
                    variant={r.grade === "A" ? "default" : "secondary"}
                    className={
                      r.grade === "A"
                        ? "border-green-600 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
                        : "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
                    }
                  >
                    {r.grade} · {r.score}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-baseline justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Recent amendments (last 7 days)
            </CardTitle>
            <Link
              href="/opportunities"
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              All opportunities →
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
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
                    <Badge variant={deadlineChange ? "destructive" : "outline"}>
                      {deadlineChange ? "Deadline changed" : "Amended"}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-baseline justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Upcoming deadlines (next 14 days)
            </CardTitle>
            <Link
              href={`/workspaces/${primary.id}/monitoring`}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              {activeProfile
                ? `Profile: ${activeProfile.name} →`
                : "Set up a monitoring profile →"}
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Assessment usage
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">
            Assessment lands in Phase 4 — deep qualification against selected
            opportunities with LLM-based requirement extraction and a per-plan
            quota.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
