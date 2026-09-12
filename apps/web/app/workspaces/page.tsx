import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { listMyWorkspaces } from "@/lib/workspaces/service";
import { signOut } from "../dashboard/actions";

export default async function WorkspacesPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const workspaces = await listMyWorkspaces();

  if (workspaces.length === 0) {
    redirect("/workspaces/new");
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workspaces</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as{" "}
            <span className="font-mono">{user.email}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/opportunities"
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
          >
            Opportunities
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <ul className="flex flex-col gap-2">
        {workspaces.map((w) => (
          <li
            key={w.id}
            className="flex items-center justify-between gap-4 rounded-md border p-4"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{w.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {w.workspace_type} · {w.plan} · created{" "}
                {new Date(w.created_at).toLocaleDateString()}
              </p>
            </div>
            <Link
              href={`/workspaces/${w.id}/onboarding`}
              className="shrink-0 rounded-md border px-2 py-1 text-xs hover:bg-accent"
            >
              Import from e-GP
            </Link>
            <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
              {w.slug}
            </span>
          </li>
        ))}
      </ul>

      <Link
        href="/workspaces/new"
        className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        New workspace
      </Link>
    </main>
  );
}
