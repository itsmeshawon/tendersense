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
import type {
  AssessmentRow,
  EvaluationRow,
} from "@/lib/assessment/repository";
import type { RequirementRow } from "@/lib/assessment/repository";
import type { EvaluationStatus } from "@/lib/assessment/types";
import type { UsageState } from "@/lib/assessment/quota";
import { RunAssessmentButton } from "./run-assessment-button";

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
  assessment,
  requirements,
  evaluations,
  workspaceId,
  usage,
}: {
  opportunity: Opportunity;
  match: OpportunityMatchRow | null;
  revisions: RevisionRow[];
  assessment: AssessmentRow | null;
  requirements: RequirementRow[];
  evaluations: EvaluationRow[];
  workspaceId: string | null;
  usage: UsageState | null;
}) {
  const evalByReq = new Map(evaluations.map((e) => [e.requirement_id, e]));
  const requirementsByCategory = groupBy(
    requirements,
    (r) => r.category as string,
  );
  const remaining = daysUntil(opportunity.deadline_at);
  const isEgpBppa =
    opportunity.source_key === "bd_egp" || opportunity.source_key === "bd_bppa";
  const egpId = (opportunity.source_metadata as { egpId?: string } | null)
    ?.egpId;

  return (
    <Tabs defaultValue="verdict" className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-3">
        <TabsTrigger value="verdict">Verdict</TabsTrigger>
        <TabsTrigger value="requirements">
          Requirements
          {requirements.length > 0 ? (
            <span className="ml-1.5 text-muted-foreground">
              {requirements.length}
            </span>
          ) : null}
        </TabsTrigger>
        <TabsTrigger value="overview">Overview</TabsTrigger>
      </TabsList>

      {/* ---------- Overview ---------- */}
      <TabsContent value="overview" className="mt-6 flex flex-col gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
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
              <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
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
              <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
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

        {/* Activity + source — compact strip. Replaces the old Timeline
            and Source tabs; the deep source metadata rarely earned its
            own top-level nav slot. */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-baseline justify-between gap-3">
              <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
                Activity
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {revisions.length} revision{revisions.length === 1 ? "" : "s"} · {opportunity.source_key}
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-0 text-sm">
            {revisions.length > 0 ? (
              <ol className="flex flex-col gap-1.5 border-l pl-4">
                {revisions.slice(0, 3).map((r) => {
                  const deadlineChange =
                    r.changed_fields.includes("deadline_at");
                  return (
                    <li key={r.id} className="flex items-baseline gap-2">
                      <Badge
                        variant={deadlineChange ? "destructive" : "outline"}
                        className="shrink-0"
                      >
                        Rev {r.revision_no}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {fmt(r.detected_at)}
                        {deadlineChange
                          ? " · deadline changed"
                          : r.changed_fields.length > 0
                            ? ` · ${r.changed_fields.join(", ")}`
                            : ""}
                      </span>
                    </li>
                  );
                })}
              </ol>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
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
                    className="inline-flex items-center gap-1 rounded-md border border-primary bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
                  >
                    Open tender on e-GP →
                  </button>
                </form>
              ) : opportunity.source_url ? (
                <a
                  href={opportunity.source_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 rounded-md border border-primary bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
                >
                  Open original notice →
                </a>
              ) : null}
              <span className="text-xs text-muted-foreground">
                {opportunity.reference_no ? (
                  <>
                    Ref{" "}
                    <span className="font-mono text-foreground">
                      {opportunity.reference_no}
                    </span>
                  </>
                ) : null}
              </span>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ---------- Verdict (fit + eligibility together) ---------- */}
      <TabsContent value="verdict" className="mt-6 flex flex-col gap-4">
        {workspaceId ? (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {usage
                ? usage.unlimited
                  ? "Pro plan · unlimited assessments"
                  : `${usage.used} of ${usage.limit} used this month`
                : ""}
            </p>
            <RunAssessmentButton
              workspaceId={workspaceId}
              opportunityId={opportunity.id}
              disabled={usage?.exhausted ?? false}
              label={assessment ? "Re-run Assessment" : "Run Assessment"}
            />
          </div>
        ) : null}
        {assessment ? (
          <>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-baseline justify-between gap-4">
                  <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
                    Eligibility verdict
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <EligibilityBadge value={assessment.eligibility} />
                    {assessment.recommendation ? (
                      <RecommendationBadge value={assessment.recommendation} />
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-semibold">
                  {assessment.eligibility_score ?? "—"}
                  <span className="text-base font-normal text-muted-foreground">
                    {" "}
                    / 100
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Extraction: {assessment.extraction_method} · Scoring v
                  {assessment.scoring_version} · run{" "}
                  {fmt(assessment.completed_at ?? assessment.requested_at)}
                </p>
              </CardContent>
            </Card>

            {Object.keys(assessment.category_scores).length > 0 ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
                    Category scores
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="flex flex-col gap-2 text-sm">
                    {Object.entries(assessment.category_scores).map(
                      ([cat, s]) => (
                        <li
                          key={cat}
                          className="flex items-baseline justify-between gap-4"
                        >
                          <span className="capitalize text-muted-foreground">
                            {cat.replace(/_/g, " ")}
                          </span>
                          <span className="font-mono text-sm">{s}</span>
                        </li>
                      ),
                    )}
                  </ul>
                </CardContent>
              </Card>
            ) : null}
          </>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-8 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                No assessment run yet.
              </p>
              <p className="mt-2">
                Run one to see per-requirement eligibility and a recommendation.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Fit signals from the matching engine — one axis of the two-signal
            verdict. Coexists with the eligibility card above. */}
        {match ? (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-baseline justify-between gap-4">
                <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
                  Fit — {match.score}/100
                </CardTitle>
                <GradeChip match={match} />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="mb-3 text-xs text-muted-foreground">
                Scoring v{match.scoring_version} · computed {fmt(match.computed_at)}
              </p>
              {match.reasons.length > 0 ? (
                <>
                  <p className="mb-1.5 text-xs font-medium text-foreground">
                    Signals ({match.reasons.length})
                  </p>
                  <ul className="mb-3 flex flex-col gap-1.5 text-sm">
                    {match.reasons.map((r, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="shrink-0 font-mono text-xs text-green-700 dark:text-green-400">
                          +{r.contribution}
                        </span>
                        <span className="text-muted-foreground">{r.evidence}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              {match.concerns.length > 0 ? (
                <>
                  <p className="mb-1.5 text-xs font-medium text-foreground">
                    Concerns
                  </p>
                  <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                    {match.concerns.map((c, i) => (
                      <li key={i}>{c.evidence}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </TabsContent>

      {/* ---------- Requirements ---------- */}
      <TabsContent value="requirements" className="mt-6 flex flex-col gap-4">
        {requirements.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                No requirements extracted yet.
              </p>
              <p className="mt-2">
                Requirements are populated when an assessment runs. Manual
                additions can be made once at least one run exists.
              </p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(requirementsByCategory).map(([cat, reqs]) => (
            <Card key={cat}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
                  {cat.replace(/_/g, " ")} ({reqs.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="flex flex-col gap-3 text-sm">
                  {reqs.map((r) => {
                    const ev = evalByReq.get(r.id);
                    return (
                      <li key={r.id} className="flex flex-col gap-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="flex-1 text-foreground">{r.text}</p>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {r.source === "manual" ? (
                              <Badge variant="outline">Manual</Badge>
                            ) : null}
                            {!r.mandatory ? (
                              <Badge variant="secondary">Optional</Badge>
                            ) : null}
                            {ev ? <StatusBadge value={ev.status} /> : null}
                          </div>
                        </div>
                        {ev?.reasoning ? (
                          <p className="text-xs text-muted-foreground">
                            {ev.reasoning}
                          </p>
                        ) : null}
                        {r.source_location && opportunity.description ? (
                          <SourceLocationBacklink
                            source={opportunity.description}
                            range={r.source_location}
                          />
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ))
        )}
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

function groupBy<T>(items: T[], key: (t: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const item of items) {
    const k = key(item);
    (out[k] ??= []).push(item);
  }
  return out;
}

const ELIGIBILITY_TONE: Record<string, string> = {
  pass: "border-green-600 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300",
  partial:
    "border-amber-600 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  needs_verification:
    "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
  fail: "border-red-600 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
  not_evaluated:
    "border-muted bg-muted/40 text-muted-foreground",
};

const ELIGIBILITY_LABEL: Record<string, string> = {
  pass: "Eligible",
  partial: "Partial",
  needs_verification: "Needs verification",
  fail: "Not eligible",
  not_evaluated: "Not evaluated",
};

function EligibilityBadge({ value }: { value: string | null }) {
  if (!value) return null;
  return (
    <Badge className={ELIGIBILITY_TONE[value] ?? ""}>
      {ELIGIBILITY_LABEL[value] ?? value}
    </Badge>
  );
}

const RECOMMENDATION_LABEL: Record<string, string> = {
  bid: "Bid",
  verify: "Verify",
  hold: "Hold",
  skip: "Skip",
};

function RecommendationBadge({ value }: { value: string }) {
  return (
    <Badge variant="outline" className="capitalize">
      {RECOMMENDATION_LABEL[value] ?? value}
    </Badge>
  );
}

const STATUS_LABEL: Record<EvaluationStatus, string> = {
  meets: "Meets",
  partially_meets: "Partial",
  needs_verification: "Verify",
  gap: "Gap",
  not_applicable: "N/A",
};

const STATUS_TONE: Record<EvaluationStatus, string> = {
  meets:
    "border-green-600 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300",
  partially_meets:
    "border-amber-600 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  needs_verification:
    "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
  gap: "border-red-600 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
  not_applicable: "border-muted bg-muted/40 text-muted-foreground",
};

function StatusBadge({ value }: { value: EvaluationStatus }) {
  return <Badge className={STATUS_TONE[value]}>{STATUS_LABEL[value]}</Badge>;
}

/**
 * Renders the exact text span the extractor matched, from the source
 * description. `range` is "start-end" (char offsets) written by the
 * rules extractor.
 */
function SourceLocationBacklink({
  source,
  range,
}: {
  source: string;
  range: string;
}) {
  const [startStr, endStr] = range.split("-");
  const start = Number(startStr);
  const end = Number(endStr);
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end > source.length
  ) {
    return null;
  }
  const snippet = source.slice(start, end);
  return (
    <p className="text-xs italic text-muted-foreground">
      &ldquo;{snippet}&rdquo;
    </p>
  );
}
