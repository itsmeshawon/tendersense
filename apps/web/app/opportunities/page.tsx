import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { listPublicOpportunities } from "@/lib/opportunities/service";

const DHAKA_DATE = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Dhaka",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return DHAKA_DATE.format(new Date(iso));
  } catch {
    return iso;
  }
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const diffMs = then - Date.now();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

const SOURCE_LABEL: Record<string, string> = {
  world_bank: "World Bank",
  bd_egp: "Bangladesh e-GP",
};

export default async function OpportunitiesPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const opportunities = await listPublicOpportunities({ limit: 50 });

  return (
    <main className="mx-auto flex min-h-svh max-w-4xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Opportunities
          </h1>
          <p className="text-sm text-muted-foreground">
            Public procurement notices ingested from World Bank and Bangladesh
            e-GP. Read-only for now.
          </p>
        </div>
        <Link
          href="/workspaces"
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
        >
          Workspaces
        </Link>
      </header>

      {opportunities.length === 0 ? (
        <section
          data-testid="opportunities-empty"
          className="rounded-md border border-dashed p-8 text-sm text-muted-foreground"
        >
          <p className="font-medium text-foreground">No opportunities yet.</p>
          <p className="mt-2">
            Sync jobs populate this list on a daily and 4-hourly cadence for
            World Bank and Bangladesh e-GP respectively. If this stays empty
            after a scheduled run, check the sync-runs log or the source-health
            check.
          </p>
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {opportunities.map((o) => {
            const remaining = daysUntil(o.deadline_at);
            return (
              <li
                key={o.id}
                className="flex flex-col gap-2 rounded-md border p-4 text-sm"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="font-medium leading-snug">{o.title}</h2>
                  <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                    {SOURCE_LABEL[o.source_key] ?? o.source_key}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
                  <div>
                    <div className="font-semibold text-foreground">
                      Country
                    </div>
                    <div>{o.country_name ?? o.country_code ?? "—"}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">Issuer</div>
                    <div className="truncate">
                      {o.ministry_name ??
                        o.agency_name ??
                        o.procuring_entity_name ??
                        o.issuer_name ??
                        "—"}
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">
                      Published
                    </div>
                    <div>{formatDate(o.publication_at)}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">
                      Deadline
                    </div>
                    <div>
                      {formatDate(o.deadline_at)}
                      {remaining !== null && remaining >= 0 ? (
                        <span className="ml-1 text-muted-foreground">
                          ({remaining}d)
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <a
                  href={o.source_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-1 text-xs text-muted-foreground underline hover:text-foreground"
                >
                  View original notice
                </a>
              </li>
            );
          })}
        </ul>
      )}

      <footer className="text-xs text-muted-foreground">
        TenderSense summarizes public procurement information. The official
        procurement source remains authoritative. Verify deadlines,
        eligibility, and submission requirements on the original source before
        acting.
      </footer>
    </main>
  );
}
