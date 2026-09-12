import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  listSavedSearches,
  queryParamsToSearchString,
} from "@/lib/saved-searches/repository";
import { SavedSearchForm } from "./saved-search-form";
import { DeleteButton } from "./delete-button";

export default async function SavedSearchesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const { id: workspaceId } = await params;
  const sp = await searchParams;
  // If the user arrived here via a "Save this search" link from
  // /opportunities, the current filter set is passed through `?from=<qs>`.
  const from = typeof sp.from === "string" ? sp.from : undefined;

  const supabase = await createServerSupabaseClient();
  const searches = await listSavedSearches(supabase, workspaceId);

  return (
    <main className="mx-auto flex min-h-svh max-w-4xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Saved searches
          </h1>
          <p className="text-sm text-muted-foreground">
            Named filter snapshots for <code>/opportunities</code>. Click one
            to restore its state.
          </p>
        </div>
        <Link
          href={`/workspaces/${workspaceId}`}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
        >
          ← Workspace
        </Link>
      </header>

      {from ? (
        <section className="rounded-md border p-4">
          <h2 className="text-sm font-semibold">Save this search</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Captured from <code>/opportunities{from}</code>
          </p>
          <SavedSearchForm workspaceId={workspaceId} queryString={from} />
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">
          {searches.length === 0
            ? "No saved searches yet"
            : `${searches.length} saved search${searches.length === 1 ? "" : "es"}`}
        </h2>
        {searches.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            Apply filters on <code>/opportunities</code>, then click
            &ldquo;Save this search&rdquo; on that page to snapshot it here.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {searches.map((s) => {
              const qs = queryParamsToSearchString(s.query_params);
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-4 rounded-md border p-4 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/opportunities${qs}`}
                      className="font-medium hover:underline"
                    >
                      {s.name}
                    </Link>
                    <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                      {qs || "(no filters)"}
                    </p>
                  </div>
                  <DeleteButton workspaceId={workspaceId} id={s.id} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
