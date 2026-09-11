import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { signOut } from "./actions";

export default async function DashboardPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
          >
            Sign out
          </button>
        </form>
      </header>

      <section className="rounded-md border p-4">
        <p className="text-sm text-muted-foreground">Signed in as</p>
        <p className="font-mono text-sm">{user.email}</p>
      </section>

      <section className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        Workspaces UI lands in the next session.
      </section>
    </main>
  );
}
