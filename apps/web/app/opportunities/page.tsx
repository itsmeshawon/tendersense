import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { listPublicOpportunities } from "@/lib/opportunities/service";
import type {
  ListOpportunitiesParams,
  OpportunitySort,
  OpportunityStatusFilter,
} from "@/lib/opportunities/repository";

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

/**
 * Urgency band for a days-remaining chip.
 * <7 red, <14 yellow, otherwise muted. Grade is *fit*; timeline is
 * *urgency* — the two axes stay separate per Phase 3 v2 §2a.
 */
function deadlineToneClass(days: number | null): string {
  if (days === null) return "text-muted-foreground";
  if (days < 0) return "text-muted-foreground line-through";
  if (days < 7) return "text-red-600 dark:text-red-400 font-medium";
  if (days < 14) return "text-yellow-700 dark:text-yellow-400";
  return "text-muted-foreground";
}

const SOURCE_LABEL: Record<string, string> = {
  world_bank: "World Bank",
  bd_egp: "Bangladesh e-GP",
};

const SOURCES = [
  { value: "", label: "All sources" },
  { value: "world_bank", label: "World Bank" },
  { value: "bd_egp", label: "Bangladesh e-GP" },
] as const;

const COUNTRIES = [
  { value: "", label: "All countries" },
  { value: "BD", label: "Bangladesh" },
  { value: "NP", label: "Nepal" },
  { value: "LK", label: "Sri Lanka" },
  { value: "IN", label: "India" },
] as const;

const DEADLINE_RANGES = [
  { value: "", label: "Any deadline" },
  { value: "7", label: "Next 7 days" },
  { value: "30", label: "Next 30 days" },
  { value: "90", label: "Next 90 days" },
] as const;

const STATUSES = [
  { value: "", label: "Any status" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
] as const;

const SORTS = [
  { value: "publication_desc", label: "Newest first" },
  { value: "deadline_asc", label: "Deadline soonest" },
  { value: "value_desc", label: "Highest value" },
  { value: "relevance", label: "Best match (requires search)" },
] as const;

function isSort(v: string | undefined): v is OpportunitySort {
  return (
    v === "publication_desc" ||
    v === "deadline_asc" ||
    v === "value_desc" ||
    v === "relevance"
  );
}

function parseFilters(
  sp: Record<string, string | string[] | undefined>,
): ListOpportunitiesParams {
  const country = typeof sp.country === "string" ? sp.country : undefined;
  const source = typeof sp.source === "string" ? sp.source : undefined;
  const statusRaw = typeof sp.status === "string" ? sp.status : undefined;
  const status: OpportunityStatusFilter | undefined =
    statusRaw === "open" || statusRaw === "closed" ? statusRaw : undefined;
  const deadlineRaw =
    typeof sp.deadline === "string" ? Number(sp.deadline) : undefined;
  const deadlineWithinDays =
    Number.isFinite(deadlineRaw) && deadlineRaw && deadlineRaw > 0
      ? deadlineRaw
      : undefined;
  const q = typeof sp.q === "string" && sp.q.trim().length > 0 ? sp.q : undefined;
  const sortRaw = typeof sp.sort === "string" ? sp.sort : undefined;
  const sort = isSort(sortRaw) ? sortRaw : undefined;
  return {
    country: country || undefined,
    source: source || undefined,
    status,
    deadlineWithinDays,
    q,
    sort,
    limit: 50,
  };
}

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const filters = parseFilters(sp);
  const opportunities = await listPublicOpportunities(filters);

  const activeFilters = [
    filters.source && SOURCE_LABEL[filters.source],
    filters.country &&
      COUNTRIES.find((c) => c.value === filters.country)?.label,
    filters.deadlineWithinDays &&
      DEADLINE_RANGES.find(
        (d) => d.value === String(filters.deadlineWithinDays),
      )?.label,
    filters.status &&
      STATUSES.find((s) => s.value === filters.status)?.label,
  ].filter((v): v is string => Boolean(v));

  return (
    <main className="mx-auto flex min-h-svh max-w-4xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Opportunities
          </h1>
          <p className="text-sm text-muted-foreground">
            Public procurement notices ingested from World Bank and Bangladesh
            e-GP.
          </p>
        </div>
        <Link
          href="/workspaces"
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
        >
          Workspaces
        </Link>
      </header>

      <form
        method="get"
        className="flex flex-col gap-3 rounded-md border p-4"
      >
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-semibold text-foreground">Search</span>
          <input
            type="search"
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder='Try "ERP" or "solar OR wind"'
            className="rounded-md border px-3 py-2 text-sm"
          />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-foreground">Source</span>
            <select
              name="source"
              defaultValue={filters.source ?? ""}
              className="rounded-md border px-3 py-2 text-sm"
            >
              {SOURCES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-foreground">Country</span>
            <select
              name="country"
              defaultValue={filters.country ?? ""}
              className="rounded-md border px-3 py-2 text-sm"
            >
              {COUNTRIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-foreground">Deadline</span>
            <select
              name="deadline"
              defaultValue={
                filters.deadlineWithinDays
                  ? String(filters.deadlineWithinDays)
                  : ""
              }
              className="rounded-md border px-3 py-2 text-sm"
            >
              {DEADLINE_RANGES.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-foreground">Status</span>
            <select
              name="status"
              defaultValue={filters.status ?? ""}
              className="rounded-md border px-3 py-2 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1 text-xs sm:max-w-xs">
          <span className="font-semibold text-foreground">Sort by</span>
          <select
            name="sort"
            defaultValue={filters.sort ?? "publication_desc"}
            className="rounded-md border px-3 py-2 text-sm"
          >
            {SORTS.map((s) => (
              <option
                key={s.value}
                value={s.value}
                disabled={s.value === "relevance" && !filters.q}
              >
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {activeFilters.length > 0
              ? `Filters: ${activeFilters.join(" · ")}`
              : "No filters"}
          </p>
          <div className="flex items-center gap-2">
            {activeFilters.length > 0 ? (
              <Link
                href="/opportunities"
                className="text-xs text-muted-foreground underline hover:text-foreground"
              >
                Clear all
              </Link>
            ) : null}
            <button
              type="submit"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
            >
              Apply
            </button>
          </div>
        </div>
      </form>

      <p className="text-xs text-muted-foreground">
        Showing {opportunities.length} result
        {opportunities.length === 1 ? "" : "s"}
        {activeFilters.length > 0 ? " with filters applied" : ""}.
      </p>

      {opportunities.length === 0 ? (
        <section
          data-testid="opportunities-empty"
          className="rounded-md border border-dashed p-8 text-sm text-muted-foreground"
        >
          <p className="font-medium text-foreground">
            {activeFilters.length > 0
              ? "No opportunities match these filters."
              : "No opportunities yet."}
          </p>
          <p className="mt-2">
            {activeFilters.length > 0
              ? "Try broadening the filters, or clear them to see everything."
              : "Sync jobs populate this list on a daily and 4-hourly cadence for World Bank and Bangladesh e-GP respectively."}
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
                      {remaining !== null ? (
                        <span className={`ml-1 ${deadlineToneClass(remaining)}`}>
                          ({remaining >= 0 ? `${remaining}d` : `${-remaining}d past`})
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {o.reference_no ? (
                    <span>
                      Ref{" "}
                      <span className="font-mono text-foreground">
                        {o.reference_no}
                      </span>
                    </span>
                  ) : null}
                  <a
                    href={o.source_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="underline hover:text-foreground"
                  >
                    {o.source_key === "bd_egp"
                      ? "Open e-GP search page (look up by ref no)"
                      : "View original notice"}
                  </a>
                </div>
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
