import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServerUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getWorkspaceById,
  listWorkspaceMembers,
} from "@/lib/workspaces/repository";

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

  const [members, projects] = await Promise.all([
    listWorkspaceMembers(supabase, id),
    listProjectsForWorkspace(supabase, id),
  ]);

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
          <Link
            href={`/workspaces/${id}/monitoring`}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
          >
            Monitoring
          </Link>
          <Link
            href="/workspaces"
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
          >
            Back
          </Link>
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Members ({members.length})
          </h2>
        </div>
        <ul className="flex flex-col gap-1 rounded-md border p-3 text-sm">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-4"
            >
              <span className="truncate font-mono text-xs">{m.user_id}</span>
              <span className="text-xs text-muted-foreground">
                {m.role} · {m.status}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Member management (invite / remove) is deferred to Pro tier — see
          ADR 0006 §7.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Past projects ({projects.length})
          </h2>
          <Link
            href={`/workspaces/${id}/onboarding`}
            className="rounded-md border px-2 py-1 text-xs hover:bg-accent"
          >
            Import from e-GP
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">No projects yet.</p>
            <p className="mt-1">
              Import your past contracts from Bangladesh e-GP — type your
              company name and pick which ones are yours. No manual entry.
            </p>
            <Link
              href={`/workspaces/${id}/onboarding`}
              className="mt-3 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Start import
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {projects.map((p) => (
              <li
                key={p.id}
                className="flex flex-col gap-1 rounded-md border p-4 text-sm"
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
      </section>
    </main>
  );
}
