import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listExperts } from "@/lib/experts/repository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { AddExpertForm } from "./add-form";
import { ExpertRowUI } from "./row";

export default async function ExpertsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const { id: workspaceId } = await params;
  const supabase = await createServerSupabaseClient();
  const rows = await listExperts(supabase, workspaceId);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <PageHeader
        backHref={`/workspaces/${workspaceId}`}
        backLabel="Back to workspace"
        title="Key experts"
        description="Named personnel you can propose for consultancy or delivery engagements."
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
            Add expert
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <AddExpertForm workspaceId={workspaceId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
            Roster ({rows.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No experts recorded yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {rows.map((r) => (
                <ExpertRowUI key={r.id} row={r} workspaceId={workspaceId} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
