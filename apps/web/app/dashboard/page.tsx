import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listMyWorkspaces } from "@/lib/workspaces/service";
import { resolveActiveWorkspaceId } from "@/lib/workspaces/context";
import { listRecentRevisions } from "@/lib/revisions/repository";
import { listOpportunities } from "@/lib/opportunities/repository";
import { listMonitoringProfiles } from "@/lib/monitoring/repository";
import { listRecommendedMatches } from "@/lib/matching/repository";
import { getUsage, type WorkspacePlan } from "@/lib/assessment/quota";
import { GradeChip } from "@/components/GradeChip";
import { EligibilityChip } from "@/components/EligibilityChip";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionHeader } from "@/components/PageHeader";

const SOURCE_LABEL: Record<string, string> = {
  world_bank: "World Bank",
  bd_egp: "Bangladesh e-GP",
  bd_bppa: "Bangladesh BPPA",
};

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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const workspaces = await listMyWorkspaces();
  if (workspaces.length === 0) redirect("/workspaces/new");

  const sp = await searchParams;
  const requested = typeof sp.workspace === "string" ? sp.workspace : undefined;
  const primary = (await resolveActiveWorkspaceId({
    workspaces,
    requestedId: requested,
  })) ?? workspaces[0];
  const plan: WorkspacePlan = (primary.plan as WorkspacePlan) ?? "free";
  const supabase = await createServerSupabaseClient();

  const [
    recentRevisions,
    upcoming,
    profiles,
    recommended,
    totalMatchesRes,
    aGradeRes,
    usage,
  ] = await Promise.all([
    listRecentRevisions(supabase, 7, 10),
    listOpportunities(supabase, {
      status: "open",
      deadlineWithinDays: 14,
      limit: 8,
      sort: "deadline_asc",
    }),
    listMonitoringProfiles(supabase, primary.id),
    listRecommendedMatches(supabase, primary.id, 5),
    supabase
      .from("opportunity_matches")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", primary.id),
    supabase
      .from("opportunity_matches")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", primary.id)
      .eq("grade", "A"),
    getUsage(supabase, primary.id, plan),
  ]);

  const activeProfile = profiles.find((p) => p.is_active);
  const monitoredCount = totalMatchesRes.count ?? 0;
  const aGradeCount = aGradeRes.count ?? 0;

  const stats: Array<{ value: string; label: string }> = [
    { value: monitoredCount.toString(), label: "monitored" },
    {
      value: usage.unlimited ? "∞" : `${usage.used}/${usage.limit}`,
      label: "assessments this month",
    },
    { value: aGradeCount.toString(), label: "A-grade" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8">
      <PageHeader
        title={`Good day — ${primary.name}`}
        description={
          <>
            {plan === "pro" ? "Pro" : "Free"} workspace
            {activeProfile ? (
              <>
                {" · monitoring "}
                <span className="text-foreground">{activeProfile.name}</span>
              </>
            ) : null}
          </>
        }
      />

      {/* Stats strip — actionable numbers. */}
      <dl className="grid grid-cols-3 divide-x divide-border/60 rounded-lg border border-border/70 bg-card">
        {stats.map((s) => (
          <div key={s.label} className="px-5 py-4">
            <dt className="text-xs text-muted-foreground">{s.label}</dt>
            <dd className="mt-0.5 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-foreground">
              {s.value}
            </dd>
          </div>
        ))}
      </dl>

      {/* Recommended for you */}
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
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
        {recommended.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
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
          <ul className="mt-3 flex flex-col gap-3">
            {recommended.map((r) => {
              const topReason = r.reasons?.[0] ?? null;
              const topConcern = r.concerns?.[0] ?? null;
              const opp = r.opportunity;
              return (
                <li key={r.id}>
                  <Card className="transition-colors hover:bg-accent/30">
                    <CardContent className="px-4 py-2 text-sm">
                      <div className="flex items-start gap-6">
                        <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                          <Link
                            href={`/opportunities/${r.opportunity_id}?workspace=${primary.id}`}
                            className="font-semibold text-base leading-snug hover:underline"
                          >
                            {opp?.title ?? "—"}
                          </Link>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="font-medium text-accent-foreground">
                              {SOURCE_LABEL[opp?.source_key ?? ""] ?? opp?.source_key ?? "—"}
                            </span>
                            <span>·</span>
                            <span>{opp?.country_name ?? "—"}</span>
                          </div>
                          {(topReason || topConcern) ? (
                            <div className="flex flex-wrap gap-1.5">
                              {topReason ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs text-green-700 dark:border-green-800 dark:bg-green-950/50 dark:text-green-400">
                                  ✓ {topReason.evidence.length > 40 ? topReason.evidence.slice(0, 40) + "…" : topReason.evidence}
                                </span>
                              ) : null}
                              {topConcern ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
                                  ⚠ {topConcern.evidence.length > 40 ? topConcern.evidence.slice(0, 40) + "…" : topConcern.evidence}
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1.5">
                          <GradeChip match={r} />
                          <EligibilityChip value={r.eligibility} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Closing this week */}
      <section>
        <SectionHeader
          title="Closing this week"
          description="Open tenders with deadlines in the next 14 days"
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
        {upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nothing closes in the next 14 days.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {upcoming.map((o) => {
              const days = daysUntil(o.deadline_at);
              return (
                <li key={o.id}>
                  <Card className="transition-colors hover:bg-accent/30">
                    <CardContent className="px-4 py-2 text-sm">
                      <div className="flex items-start gap-6">
                        <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                          <Link
                            href={`/opportunities/${o.id}?workspace=${primary.id}`}
                            className="font-semibold text-base leading-snug hover:underline"
                          >
                            {o.title}
                          </Link>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="font-medium text-accent-foreground">
                              {SOURCE_LABEL[o.source_key] ?? o.source_key}
                            </span>
                            <span>·</span>
                            <span>{o.country_name ?? o.country_code ?? "—"}</span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right text-xs text-muted-foreground">
                          <span
                            className={
                              days !== null && days < 7
                                ? "font-medium text-red-600 dark:text-red-400"
                                : ""
                            }
                          >
                            {fmt(o.deadline_at)}
                            {days !== null ? ` (${days}d)` : ""}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Recent tender updates */}
      <section>
        <SectionHeader
          title="Recent tender updates"
          description="Amendments and deadline changes across the pool in the last 7 days"
          accessory={
            <Link
              href="/opportunities"
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              All opportunities →
            </Link>
          }
        />
        {recentRevisions.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No amendments in the last 7 days.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {recentRevisions.map((r) => {
              const deadlineChange = r.changed_fields.includes("deadline_at");
              return (
                <li key={r.id}>
                  <Card className="transition-colors hover:bg-accent/30">
                    <CardContent className="px-4 py-2 text-sm">
                      <div className="flex items-start gap-6">
                        <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                          <Link
                            href={`/opportunities/${r.opportunity?.id}?workspace=${primary.id}`}
                            className="font-semibold text-base leading-snug hover:underline"
                          >
                            {r.opportunity?.title ?? "—"}
                          </Link>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="font-medium text-accent-foreground">
                              {SOURCE_LABEL[r.opportunity?.source_key ?? ""] ?? r.opportunity?.source_key ?? "—"}
                            </span>
                            <span>·</span>
                            <span>Rev {r.revision_no}</span>
                            <span>·</span>
                            <span>{fmt(r.detected_at)}</span>
                          </div>
                        </div>
                        <div className="shrink-0">
                          <Badge variant={deadlineChange ? "destructive" : "outline"}>
                            {deadlineChange ? "Deadline changed" : "Amended"}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
