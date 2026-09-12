import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { listMyWorkspaces } from "@/lib/workspaces/service";
import { signOut } from "../dashboard/actions";
import { NotificationsBell } from "@/components/NotificationsBell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function WorkspacesPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const workspaces = await listMyWorkspaces();

  if (workspaces.length === 0) {
    redirect("/workspaces/new");
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workspaces</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-mono">{user.email}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationsBell />
          <Link href="/opportunities">
            <Button variant="outline" size="sm">
              Opportunities
            </Button>
          </Link>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <ul className="flex flex-col gap-3">
        {workspaces.map((w) => (
          <li key={w.id}>
            <Card className="transition-colors hover:bg-accent/40">
              <CardHeader className="pb-3">
                <div className="flex items-baseline justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <CardTitle>
                      <Link
                        href={`/workspaces/${w.id}`}
                        className="hover:underline"
                      >
                        {w.name}
                      </Link>
                    </CardTitle>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      Created {new Date(w.created_at).toLocaleDateString()}
                      <span className="hidden sm:inline">
                        {" "}
                        · <span className="font-mono">{w.slug}</span>
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="secondary">{w.workspace_type}</Badge>
                    <Badge variant={w.plan === "pro" ? "default" : "outline"}>
                      {w.plan}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2 pt-0">
                <Link href={`/opportunities?workspace=${w.id}`}>
                  <Button variant="secondary" size="sm">
                    Opportunities
                  </Button>
                </Link>
                <Link href={`/workspaces/${w.id}/monitoring`}>
                  <Button variant="outline" size="sm">
                    Monitoring
                  </Button>
                </Link>
                <Link href={`/workspaces/${w.id}/capabilities`}>
                  <Button variant="outline" size="sm">
                    Capabilities
                  </Button>
                </Link>
                <Link href={`/workspaces/${w.id}/onboarding`}>
                  <Button variant="outline" size="sm">
                    Import from e-GP
                  </Button>
                </Link>
                <Link href={`/workspaces/${w.id}`} className="ml-auto">
                  <Button variant="ghost" size="sm">
                    Open →
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      <Link href="/workspaces/new">
        <Button size="lg" className="self-start">
          New workspace
        </Button>
      </Link>
    </main>
  );
}
