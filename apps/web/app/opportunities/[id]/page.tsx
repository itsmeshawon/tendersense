import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOpportunityById } from "@/lib/opportunities/repository";
import { listRevisionsForOpportunity } from "@/lib/revisions/repository";
import { listMatchesByIds } from "@/lib/matching/repository";
import { listMyWorkspaces } from "@/lib/workspaces/service";
import {
  getLatestAssessment,
  listEvaluationsForRequirements,
  listRequirements,
} from "@/lib/assessment/repository";
import { getUsage, type WorkspacePlan } from "@/lib/assessment/quota";
import { NotificationsBell } from "@/components/NotificationsBell";
import { Button } from "@/components/ui/button";
import { OpportunityDetailTabs } from "./detail-tabs";

const SOURCE_LABEL: Record<string, string> = {
  world_bank: "World Bank",
  bd_egp: "Bangladesh e-GP",
  bd_bppa: "Bangladesh BPPA",
};

export default async function OpportunityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const sp = await searchParams;
  const workspaceParam =
    typeof sp.workspace === "string" ? sp.workspace : undefined;

  const supabase = await createServerSupabaseClient();
  const [opp, workspaces] = await Promise.all([
    getOpportunityById(supabase, id),
    listMyWorkspaces(),
  ]);

  if (!opp) notFound();

  // Pick workspace context: ?workspace= first, else first workspace
  const requestedWs =
    workspaceParam && workspaces.some((w) => w.id === workspaceParam)
      ? workspaceParam
      : undefined;
  const activeWorkspaceId = requestedWs ?? workspaces[0]?.id;
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  // In parallel: match + revisions + latest assessment
  const [matches, revisions, assessment] = await Promise.all([
    activeWorkspaceId
      ? listMatchesByIds(supabase, activeWorkspaceId, [opp.id])
      : Promise.resolve([]),
    listRevisionsForOpportunity(supabase, opp.id),
    activeWorkspaceId
      ? getLatestAssessment(supabase, activeWorkspaceId, opp.id)
      : Promise.resolve(null),
  ]);
  const match = matches[0] ?? null;

  const requirements = assessment
    ? await listRequirements(supabase, assessment.id)
    : [];
  const evaluations = requirements.length
    ? await listEvaluationsForRequirements(
        supabase,
        requirements.map((r) => r.id),
      )
    : [];

  const workspacePlan: WorkspacePlan =
    (activeWorkspace?.plan as WorkspacePlan | undefined) ?? "free";
  const usage = activeWorkspaceId
    ? await getUsage(supabase, activeWorkspaceId, workspacePlan)
    : null;

  const backHref = activeWorkspaceId
    ? `/opportunities?workspace=${activeWorkspaceId}`
    : "/opportunities";

  return (
    <main className="mx-auto flex min-h-svh max-w-4xl flex-col gap-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {SOURCE_LABEL[opp.source_key] ?? opp.source_key}
            {opp.reference_no ? (
              <>
                {" · Ref "}
                <span className="font-mono text-foreground">
                  {opp.reference_no}
                </span>
              </>
            ) : null}
          </p>
          <h1 className="mt-1 text-2xl font-semibold leading-snug tracking-tight">
            {opp.title}
          </h1>
          {activeWorkspace ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Grade for <strong>{activeWorkspace.name}</strong>
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <NotificationsBell />
          <Link href={backHref}>
            <Button variant="outline" size="sm">
              ← All opportunities
            </Button>
          </Link>
        </div>
      </header>

      <OpportunityDetailTabs
        opportunity={opp}
        match={match}
        revisions={revisions}
        assessment={assessment}
        requirements={requirements}
        evaluations={evaluations}
        workspaceId={activeWorkspaceId ?? null}
        usage={usage}
      />
    </main>
  );
}
