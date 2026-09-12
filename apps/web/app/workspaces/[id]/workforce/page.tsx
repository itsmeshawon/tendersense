import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getWorkforce } from "@/lib/workforce/repository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { WorkforceForm } from "./form";

const ROLE_LABEL: Record<string, string> = {
  engineers: "Engineers",
  project_managers: "Project managers",
  business_analysts: "Business analysts",
  ux_designers: "UX designers",
  qa_engineers: "QA engineers",
  devops_engineers: "DevOps engineers",
  security_specialists: "Security specialists",
  data_engineers: "Data engineers",
};

export default async function WorkforcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const { id: workspaceId } = await params;
  const supabase = await createServerSupabaseClient();
  const current = await getWorkforce(supabase, workspaceId);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <PageHeader
        backHref={`/workspaces/${workspaceId}`}
        backLabel="Back to workspace"
        title="Workforce"
        description="Team size and role composition. Used for tender rules like “minimum 20 engineers on the delivery team.”"
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
            Team composition
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <WorkforceForm
            workspaceId={workspaceId}
            defaults={{
              totalEmployees: current?.total_employees ?? null,
              roleCounts: current?.role_counts ?? {},
            }}
            roles={Object.entries(ROLE_LABEL).map(([key, label]) => ({
              key,
              label,
            }))}
          />
        </CardContent>
      </Card>
    </main>
  );
}
