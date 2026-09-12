import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listMyWorkspaces } from "@/lib/workspaces/service";
import { listRecentRevisions } from "@/lib/revisions/repository";
import { listOpportunities } from "@/lib/opportunities/repository";
import { listMonitoringProfiles } from "@/lib/monitoring/repository";
import { listRecommendedMatches } from "@/lib/matching/repository";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionHeader } from "@/components/PageHeader";

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
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8">
      <PageHeader
        title={`Good day — ${primary.name}`}
        description={`Your ${primary.plan === "pro" ? "Pro" : "Free"} workspace, at a glance.`}
      />

      {/* Hero — Recommended for you gets the visual weight. */}
      <section className="rounded-xl border border-border/70 bg-card">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div>
            <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold tracking-tight">
              Recommended for you
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              A- and B-grade fits from your monitoring profile.
            </p>
          </div>
          <Link
            href={`/opportunities?workspace=${primary.id}&sort=grade_desc`}
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            See all →
          </Link>
        </div>
        <div className="px-5 py-4">
          {recommended.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No A or B fits yet. Adjust your{" "}
              <Link
                href={`/workspaces/${primary.id}/monitoring`}
                className="text-foreground underline underline-offset-4"
              >
                monitoring profile
              </Link>{" "}
              or{" "}
              <Link
                href={`/workspaces/${primary.id}/capabilities`}
                className="text-foreground underline underline-offset-4"
              >
                capabilities
              </Link>
              — grades recompute automatically.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border/60">
              {recommended.map((r) => (
                <li key={r.id} className="flex items-center gap-4 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/opportunities/${r.opportunity_id}?workspace=${primary.id}`}
                      className="block truncate font-medium hover:underline"
                    >
                      {r.opportunity?.title ?? "—"}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.opportunity?.source_key} ·{" "}
                      {r.opportunity?.country_name ?? "—"}
                    </p>
                  </div>
                  <Badge
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
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section>
          <SectionHeader
            title="Recent amendments"
            description="Last 7 days"
            accessory={
              <Link
                href="/opportunities"
                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                All opportunities →
              </Link>
            }
          />
          <Card className="mt-3">
            <CardContent className="p-4">
              {recentRevisions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No amendments in the last 7 days.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-border/60">
                  {recentRevisions.map((r) => {
                    const deadlineChange = r.changed_fields.includes(
                      "deadline_at",
                    );
                    return (
                      <li
                        key={r.id}
                        className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate">{r.opportunity?.title ?? "—"}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {r.opportunity?.source_key} · Rev {r.revision_no} ·{" "}
                            {fmt(r.detected_at)}
                          </p>
                        </div>
                        <Badge
                          variant={deadlineChange ? "destructive" : "outline"}
                        >
                          {deadlineChange ? "Deadline changed" : "Amended"}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>

        <section>
          <SectionHeader
            title="Upcoming deadlines"
            description="Next 14 days"
            accessory={
              <Link
                href={`/workspaces/${primary.id}/monitoring`}
                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {activeProfile
                  ? `Profile: ${activeProfile.name} →`
                  : "Set up a profile →"}
              </Link>
            }
          />
          <Card className="mt-3">
            <CardContent className="p-4">
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing closes in the next 14 days.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-border/60">
                  {upcoming.map((o) => {
                    const days = daysUntil(o.deadline_at);
                    return (
                      <li
                        key={o.id}
                        className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate">{o.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {o.source_key} ·{" "}
                            {o.country_name ?? o.country_code ?? "—"}
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
        </section>
      </div>
    </main>
  );
}
