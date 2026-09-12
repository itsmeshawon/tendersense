import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { listMyWorkspaces } from "@/lib/workspaces/service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";

export default async function WorkspacesPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const workspaces = await listMyWorkspaces();
  if (workspaces.length === 0) redirect("/workspaces/new");

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <PageHeader
        title="Workspaces"
        description={
          <>
            Signed in as <span className="font-mono">{user.email}</span>
          </>
        }
        actions={
          <Link href="/workspaces/new">
            <Button size="sm">New workspace</Button>
          </Link>
        }
      />

      <ul className="flex flex-col gap-3">
        {workspaces.map((w) => (
          <li key={w.id}>
            <Card className="transition-colors hover:bg-accent/40">
              <CardContent className="p-4">
                <div className="flex items-baseline justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/workspaces/${w.id}`}
                      className="font-[family-name:var(--font-heading)] text-base font-semibold hover:underline"
                    >
                      {w.name}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {w.workspace_type} · created{" "}
                      {new Date(w.created_at).toLocaleDateString()} ·{" "}
                      <span className="font-mono">{w.slug}</span>
                    </p>
                  </div>
                  <Badge variant={w.plan === "pro" ? "default" : "outline"}>
                    {w.plan}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link href={`/opportunities?workspace=${w.id}`}>
                    <Button variant="secondary" size="sm">
                      Opportunities
                    </Button>
                  </Link>
                  <Link href={`/workspaces/${w.id}`}>
                    <Button variant="ghost" size="sm">
                      Open →
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </main>
  );
}
