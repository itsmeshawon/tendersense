"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GradeChip } from "@/components/GradeChip";
import type { Opportunity } from "@/lib/opportunities/repository";
import type { OpportunityMatchRow } from "@/lib/matching/repository";
import type { RevisionRow } from "@/lib/revisions/repository";

const DHAKA_DATE = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Dhaka",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return DHAKA_DATE.format(new Date(iso));
  } catch {
    return iso;
  }
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.round((then - Date.now()) / (1000 * 60 * 60 * 24));
}

export function OpportunityDetailTabs({
  opportunity,
  match,
  revisions,
}: {
  opportunity: Opportunity;
  match: OpportunityMatchRow | null;
  revisions: RevisionRow[];
}) {
  const remaining = daysUntil(opportunity.deadline_at);
  const isEgpBppa =
    opportunity.source_key === "bd_egp" || opportunity.source_key === "bd_bppa";
  const egpId = (opportunity.source_metadata as { egpId?: string } | null)
    ?.egpId;

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="match">Match</TabsTrigger>
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
        <TabsTrigger value="source">Source</TabsTrigger>
      </TabsList>

      {/* ---------- Overview ---------- */}
      <TabsContent value="overview" className="mt-6 flex flex-col gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              <Cell label="Country">
                {opportunity.country_name ?? opportunity.country_code ?? "—"}
              </Cell>
              <Cell label="Notice type">
                {opportunity.notice_type ?? "—"}
              </Cell>
              <Cell label="Method">
                {opportunity.procurement_method ?? "—"}
              </Cell>
              <Cell label="Publication">
                {fmt(opportunity.publication_at)}
              </Cell>
              <Cell label="Deadline">
                <span
                  className={
                    remaining !== null && remaining >= 0 && remaining < 7
                      ? "font-medium text-red-600 dark:text-red-400"
                      : ""
                  }
                >
                  {fmt(opportunity.deadline_at)}
                  {remaining !== null
                    ? ` (${
                        remaining >= 0
                          ? `${remaining}d left`
                          : `${-remaining}d past`
                      })`
                    : ""}
                </span>
              </Cell>
              <Cell label="Currency">{opportunity.currency ?? "—"}</Cell>
              <Cell label="Ministry">
                {opportunity.ministry_name ?? "—"}
              </Cell>
              <Cell label="Procuring entity">
                {opportunity.procuring_entity_name ??
                  opportunity.agency_name ??
                  "—"}
              </Cell>
              <Cell label="Project id">
                {opportunity.project_id ? (
                  <span className="font-mono text-xs">
                    {opportunity.project_id}
                  </span>
                ) : (
                  "—"
                )}
              </Cell>
            </dl>
          </CardContent>
        </Card>

        {opportunity.description ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Description
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="whitespace-pre-line text-sm text-muted-foreground">
                {opportunity.description}
              </p>
            </CardContent>
          </Card>
        ) : null}

        {Array.isArray(opportunity.tags) && opportunity.tags.length > 0 ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5 pt-0">
              {opportunity.tags.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                </Badge>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </TabsContent>

      {/* ---------- Match ---------- */}
      <TabsContent value="match" className="mt-6 flex flex-col gap-4">
        {match ? (
          <>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-baseline justify-between gap-4">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Verdict
                  </CardTitle>
                  <GradeChip match={match} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-semibold">{match.score}/100</p>
                <p className="text-xs text-muted-foreground">
                  Scoring version {match.scoring_version} · computed{" "}
                  {fmt(match.computed_at)}
                </p>
              </CardContent>
            </Card>

            {match.reasons.length > 0 ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Fit signals ({match.reasons.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="flex flex-col gap-2 text-sm">
                    {match.reasons.map((r, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="shrink-0 font-mono text-xs text-green-700 dark:text-green-400">
                          +{r.contribution}
                        </span>
                        <span className="text-muted-foreground">{r.evidence}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}

            {match.concerns.length > 0 ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Concerns
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                    {match.concerns.map((c, i) => (
                      <li key={i}>{c.evidence}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}
          </>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-8 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                No match computed for this workspace yet.
              </p>
              <p className="mt-2">
                Trigger a recompute by updating your monitoring profile or
                capabilities.
              </p>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* ---------- Timeline ---------- */}
      <TabsContent value="timeline" className="mt-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Timeline ({revisions.length + 2} events)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ol className="flex flex-col gap-3 border-l pl-4 text-sm">
              {/* Deadline (future or past) */}
              {opportunity.deadline_at ? (
                <li>
                  <div className="flex items-baseline gap-2">
                    <Badge
                      variant={
                        remaining !== null && remaining >= 0 && remaining < 7
                          ? "destructive"
                          : "outline"
                      }
                    >
                      Deadline
                    </Badge>
                    <span className="font-medium">
                      {fmt(opportunity.deadline_at)}
                    </span>
                  </div>
                </li>
              ) : null}

              {/* Revisions newest-first */}
              {revisions.map((r) => {
                const deadlineChange =
                  r.changed_fields.includes("deadline_at");
                return (
                  <li key={r.id}>
                    <div className="flex items-baseline gap-2">
                      <Badge variant={deadlineChange ? "destructive" : "outline"}>
                        Rev {r.revision_no}
                      </Badge>
                      <span className="font-medium">
                        {fmt(r.detected_at)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {deadlineChange
                        ? "Deadline changed"
                        : r.changed_fields.length > 0
                          ? `Changed: ${r.changed_fields.join(", ")}`
                          : "Amended"}
                    </p>
                  </li>
                );
              })}

              {/* Publication event */}
              {opportunity.publication_at ? (
                <li>
                  <div className="flex items-baseline gap-2">
                    <Badge variant="secondary">Published</Badge>
                    <span className="font-medium">
                      {fmt(opportunity.publication_at)}
                    </span>
                  </div>
                </li>
              ) : null}
            </ol>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ---------- Source ---------- */}
      <TabsContent value="source" className="mt-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Source
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-0">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Cell label="Source">{opportunity.source_key}</Cell>
              <Cell label="External id">
                <span className="font-mono text-xs">
                  {opportunity.external_id}
                </span>
              </Cell>
              <Cell label="First seen">
                {fmt(opportunity.first_seen_at)}
              </Cell>
              <Cell label="Last seen">{fmt(opportunity.last_seen_at)}</Cell>
              <Cell label="Content hash">
                <span className="font-mono text-xs">
                  {opportunity.content_hash.slice(0, 16)}…
                </span>
              </Cell>
            </dl>
            <div className="pt-2">
              {isEgpBppa && egpId ? (
                <form
                  action="https://www.eprocure.gov.bd/resources/common/ViewTender.jsp"
                  method="POST"
                  target="_blank"
                  className="inline"
                >
                  <input type="hidden" name="id" value={egpId} />
                  <input type="hidden" name="h" value="t" />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 rounded-md border border-primary bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/20"
                  >
                    Open tender on e-GP →
                  </button>
                </form>
              ) : opportunity.source_url ? (
                <a
                  href={opportunity.source_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 rounded-md border border-primary bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/20"
                >
                  Open original notice →
                </a>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No source URL available. Look up by reference number:{" "}
                  <span className="font-mono">
                    {opportunity.reference_no ?? "n/a"}
                  </span>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
