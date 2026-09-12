import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listWorkspaceCapabilities } from "@/lib/matching/repository";
import { CAPABILITY_TAXONOMY } from "@/lib/matching/taxonomy";
import { PageHeader } from "@/components/PageHeader";
import { AddCapabilityForm } from "./add-capability-form";
import { CapabilityRow } from "./capability-row";

export default async function CapabilitiesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const { id: workspaceId } = await params;
  const supabase = await createServerSupabaseClient();
  const rows = await listWorkspaceCapabilities(supabase, workspaceId);

  const existing = new Map(rows.map((r) => [r.label, r]));
  const suggested = rows.filter((r) => r.source === "auto_derived");
  const confirmed = rows.filter((r) => r.source === "user");
  const available = CAPABILITY_TAXONOMY.filter((c) => !existing.has(c.key));

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <PageHeader
        backHref={`/workspaces/${workspaceId}`}
        backLabel="Back to workspace"
        title="Capabilities"
        description="What this workspace can deliver. The biggest signal we use to grade opportunities (33 of 100 points)."
      />

      {suggested.length > 0 ? (
        <section className="flex flex-col gap-3 rounded-md border p-4">
          <div>
            <h2 className="text-sm font-semibold">
              Suggested from your imported projects
            </h2>
            <p className="text-xs text-muted-foreground">
              Auto-derived from what we found in your e-GP contract
              history. Confirm the ones you actually deliver; remove
              the rest so they don&rsquo;t skew your grades.
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {suggested.map((r) => (
              <CapabilityRow key={r.id} workspaceId={workspaceId} row={r} />
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-3 rounded-md border p-4">
        <div>
          <h2 className="text-sm font-semibold">
            Confirmed capabilities ({confirmed.length})
          </h2>
          <p className="text-xs text-muted-foreground">
            These count toward your fit grade on every opportunity.
          </p>
        </div>
        {confirmed.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No confirmed capabilities yet. Pick from the list below or
            import your past contracts on{" "}
            <Link
              href={`/workspaces/${workspaceId}/onboarding`}
              className="underline hover:text-foreground"
            >
              the onboarding page
            </Link>{" "}
            to auto-derive suggestions.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {confirmed.map((r) => (
              <CapabilityRow key={r.id} workspaceId={workspaceId} row={r} />
            ))}
          </ul>
        )}
      </section>

      {available.length > 0 ? (
        <section className="flex flex-col gap-3 rounded-md border p-4">
          <div>
            <h2 className="text-sm font-semibold">Add a capability</h2>
            <p className="text-xs text-muted-foreground">
              Pick from the 10 fixed categories. Custom labels are a
              Pro feature — the shared list keeps every workspace&rsquo;s
              grades comparable.
            </p>
          </div>
          <AddCapabilityForm
            workspaceId={workspaceId}
            options={available.map((c) => ({ key: c.key, label: c.label }))}
          />
        </section>
      ) : (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          You&rsquo;ve added every capability in the taxonomy. That&rsquo;s
          fine — but a workspace claiming everything grades every tender
          well and doesn&rsquo;t discriminate. Consider removing the ones
          you don&rsquo;t actually deliver.
        </p>
      )}
    </main>
  );
}
