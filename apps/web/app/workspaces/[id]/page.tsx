import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServerUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getWorkspaceById,
  listWorkspaceMembersWithProfile,
} from "@/lib/workspaces/repository";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { listWorkspaceCapabilities } from "@/lib/matching/repository";
import { listMonitoringProfiles } from "@/lib/monitoring/repository";
import { listSavedSearches } from "@/lib/saved-searches/repository";
import { listCredentials } from "@/lib/credentials/repository";
import { listExperts } from "@/lib/experts/repository";
import { getWorkforce } from "@/lib/workforce/repository";
import { listFinancials } from "@/lib/financials/repository";

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

  const [
    members,
    projects,
    capabilities,
    monitoringProfiles,
    savedSearches,
    credentials,
    experts,
    workforce,
    financials,
  ] = await Promise.all([
    listWorkspaceMembersWithProfile(supabase, id),
    listProjectsForWorkspace(supabase, id),
    listWorkspaceCapabilities(supabase, id),
    listMonitoringProfiles(supabase, id),
    listSavedSearches(supabase, id),
    listCredentials(supabase, id),
    listExperts(supabase, id),
    getWorkforce(supabase, id),
    listFinancials(supabase, id),
  ]);
  const latestFinancial = financials[0] ?? null;

  const confirmedCaps = capabilities.filter((c) => c.source === "user").length;
  const suggestedCaps = capabilities.filter(
    (c) => c.source === "auto_derived",
  ).length;
  const activeProfileCount = monitoringProfiles.filter(
    (p) => p.is_active,
  ).length;
  const validCredentials = credentials.filter(
    (c) => c.status === "valid",
  ).length;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <PageHeader
        crumbs={[
          { label: "Workspaces", href: "/workspaces" },
          { label: workspace.name },
        ]}
        title={workspace.name}
        description={
          <>
            {workspace.workspace_type} · {workspace.plan} · created{" "}
            {formatDate(workspace.created_at)} ·{" "}
            <span className="font-mono">{workspace.slug}</span>
          </>
        }
        actions={
          <Link href={`/opportunities?workspace=${id}`}>
            <Button size="sm">Opportunities →</Button>
          </Link>
        }
      />

      {/* Profile-at-a-glance — SoT §6 Workspace → Profile landing */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
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
            <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
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
            <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
              Credentials
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-semibold">
              {validCredentials}
              {credentials.length !== validCredentials ? (
                <span className="text-sm font-normal text-muted-foreground">
                  {" "}
                  / {credentials.length}
                </span>
              ) : null}
            </p>
            <p className="text-xs text-muted-foreground">
              {validCredentials === 0
                ? "ISO, CMMI, licences — proves eligibility"
                : "Valid certifications"}
            </p>
            <Link
              href={`/workspaces/${id}/credentials`}
              className="mt-3 inline-block"
            >
              <Button variant="outline" size="sm">
                {credentials.length === 0 ? "Add credentials" : "Manage"}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
              Key experts
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-semibold">{experts.length}</p>
            <p className="text-xs text-muted-foreground">
              Named personnel with CVs
            </p>
            <Link
              href={`/workspaces/${id}/experts`}
              className="mt-3 inline-block"
            >
              <Button variant="outline" size="sm">
                {experts.length === 0 ? "Add experts" : "Manage"}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
              Workforce
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-semibold">
              {workforce?.total_employees ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {workforce?.total_employees
                ? "Total employees"
                : "Team size + role breakdown"}
            </p>
            <Link
              href={`/workspaces/${id}/workforce`}
              className="mt-3 inline-block"
            >
              <Button variant="outline" size="sm">
                {workforce ? "Update" : "Set up"}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
              Financials
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-semibold">
              {latestFinancial?.annual_turnover != null
                ? `${latestFinancial.currency ?? ""} ${bdtFmt.format(latestFinancial.annual_turnover)}`.trim()
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {latestFinancial
                ? `FY${latestFinancial.fiscal_year}${
                    latestFinancial.is_audited ? " · audited" : ""
                  }`
                : "Turnover + audited-statement flag"}
            </p>
            <Link
              href={`/workspaces/${id}/financials`}
              className="mt-3 inline-block"
            >
              <Button variant="outline" size="sm">
                {financials.length === 0 ? "Add financials" : "Manage"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
            Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ul className="flex flex-col gap-2 text-sm">
            {members.map((m) => {
              const name = m.display_name?.trim() || null;
              const initial = (name ?? "?")
                .split(/\s+/)
                .slice(0, 2)
                .map((s) => s[0]?.toUpperCase() ?? "")
                .join("") || "?";
              return (
                <li
                  key={m.id}
                  className="flex items-center gap-3"
                >
                  {m.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.avatar_url}
                      alt=""
                      className="size-8 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-foreground"
                    >
                      {initial}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {name ?? "Unnamed member"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      Joined{" "}
                      {m.joined_at
                        ? new Date(m.joined_at).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "recently"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Badge variant="secondary">{m.role}</Badge>
                    {m.status !== "active" ? (
                      <Badge variant="outline">{m.status}</Badge>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-baseline justify-between gap-4">
            <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
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
