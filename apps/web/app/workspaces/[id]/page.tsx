import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServerUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getWorkspaceById,
  listWorkspaceMembers,
} from "@/lib/workspaces/repository";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listWorkspaceCapabilities } from "@/lib/matching/repository";
import { listMonitoringProfiles } from "@/lib/monitoring/repository";
import { listSavedSearches } from "@/lib/saved-searches/repository";

// Inlined `projects` reader — the shared `lib/workspaces/projects-repository`
// lands via PR #17. Once that merges, this reader collapses to a single
// import; the shape below matches PR #17's `ProjectRow` interface so no
// downstream code needs to change.
type ProjectRow = {
  id: string;
  workspace_id: string;
  name: string;
  client_name: string | null;
  start_date: string | null;
  end_date: string | null;
  contract_value: number | null;
  currency: string | null;
  evidence_credential_number: string | null;
};

async function listProjectsForWorkspace(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<ProjectRow[]> {
  const { data, error } = await supabase
    .from("projects")
    .select(
      "id, workspace_id, name, client_name, start_date, end_date, contract_value, currency, evidence_credential_number",
    )
    .eq("workspace_id", workspaceId)
    .order("end_date", { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data as ProjectRow[] | null) ?? [];
}

const bdtFmt = new Intl.NumberFormat("en-BD", { maximumFractionDigits: 0 });

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

export default async function WorkspaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  // RLS ensures the user only sees workspaces they're a member of.
  // A missing row here means either the workspace doesn't exist or the
  // user isn't a member — both should render as 404.
  const workspace = await getWorkspaceById(supabase, id);
  if (!workspace) notFound();

  const [members, projects, capabilities, monitoringProfiles, savedSearches] =
    await Promise.all([
      listWorkspaceMembers(supabase, id),
      listProjectsForWorkspace(supabase, id),
      listWorkspaceCapabilities(supabase, id),
      listMonitoringProfiles(supabase, id),
      listSavedSearches(supabase, id),
    ]);

  const confirmedCaps = capabilities.filter((c) => c.source === "user").length;
  const suggestedCaps = capabilities.filter(
    (c) => c.source === "auto_derived",
  ).length;
  const activeProfileCount = monitoringProfiles.filter(
    (p) => p.is_active,
  ).length;

  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col gap-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Workspace
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {workspace.name}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {workspace.workspace_type} · {workspace.plan} · created{" "}
            {formatDate(workspace.created_at)} ·{" "}
            <span className="font-mono">{workspace.slug}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href={`/opportunities?workspace=${id}`}>
            <Button variant="secondary" size="sm">
              Opportunities
            </Button>
          </Link>
          <Link href={`/workspaces/${id}/monitoring`}>
            <Button variant="outline" size="sm">
              Monitoring
            </Button>
          </Link>
          <Link href={`/workspaces/${id}/capabilities`}>
            <Button variant="outline" size="sm">
              Capabilities
            </Button>
          </Link>
          <Link href={`/workspaces/${id}/saved-searches`}>
            <Button variant="outline" size="sm">
              Saved searches
            </Button>
          </Link>
          <Link href="/workspaces">
            <Button variant="outline" size="sm">
              Back
            </Button>
          </Link>
        </div>
      </header>

      {/* Profile-at-a-glance — SoT §6 Workspace → Profile landing */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Capabilities
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-semibold">{confirmedCaps}</p>
            <p className="text-xs text-muted-foreground">
              {suggestedCaps > 0
                ? `${suggestedCaps} suggested`
                : "Drives 35% of your fit grade"}
            </p>
            <Link
              href={`/workspaces/${id}/capabilities`}
              className="mt-3 inline-block"
            >
              <Button variant="outline" size="sm">
                {confirmedCaps === 0 ? "Add capabilities" : "Manage"}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Monitoring
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-semibold">
              {activeProfileCount}
              <span className="text-sm font-normal text-muted-foreground">
                {" "}
                / {monitoringProfiles.length}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {activeProfileCount > 0
                ? "active profile"
                : "profiles configured"}
            </p>
            <Link
              href={`/workspaces/${id}/monitoring`}
              className="mt-3 inline-block"
            >
              <Button variant="outline" size="sm">
                {monitoringProfiles.length === 0
                  ? "Create profile"
                  : "Manage"}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Saved searches
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-semibold">{savedSearches.length}</p>
            <p className="text-xs text-muted-foreground">
              Bookmarked filter combinations
            </p>
            <Link
              href={`/workspaces/${id}/saved-searches`}
              className="mt-3 inline-block"
            >
              <Button variant="outline" size="sm">
                {savedSearches.length === 0 ? "Save your first" : "Manage"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ul className="flex flex-col gap-1 text-sm">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-4"
              >
                <span className="truncate font-mono text-xs">{m.user_id}</span>
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary">{m.role}</Badge>
                  <Badge variant="outline">{m.status}</Badge>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Member management (invite / remove) is deferred to Pro tier — see
            ADR 0006 §7.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-baseline justify-between gap-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Past projects ({projects.length})
            </CardTitle>
            <Link href={`/workspaces/${id}/onboarding`}>
              <Button variant="outline" size="xs">
                Import from e-GP
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {projects.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">No projects yet.</p>
              <p className="mt-1">
                Import your past contracts from Bangladesh e-GP — type your
                company name and pick which ones are yours. No manual entry.
              </p>
              <Link
                href={`/workspaces/${id}/onboarding`}
                className="mt-3 inline-block"
              >
                <Button size="sm">Start import</Button>
              </Link>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {projects.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-col gap-1 rounded-md border bg-card p-4 text-sm"
                >
                  <p className="font-medium leading-snug">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.client_name ?? "—"} · {formatDate(p.start_date)}
                    {" — "}
                    {formatDate(p.end_date)} ·{" "}
                    {p.contract_value !== null && p.currency
                      ? `${p.currency === "BDT" ? "৳" : ""}${bdtFmt.format(
                          p.contract_value,
                        )}`
                      : "—"}
                  </p>
                  {p.evidence_credential_number ? (
                    <p className="font-mono text-xs text-muted-foreground">
                      Cert: {p.evidence_credential_number}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
