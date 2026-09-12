"use client";

import Link from "next/link";
import { use, useState, useTransition } from "react";
import {
  importSelectedContracts,
  searchCompanyContracts,
  type SearchState,
} from "./actions";

const idFmt = new Intl.NumberFormat("en-BD", { maximumFractionDigits: 0 });

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

export default function OnboardingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: workspaceId } = use(params);

  const [state, setState] = useState<SearchState>({ status: "idle" });
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [isSearching, startSearch] = useTransition();
  const [isImporting, startImport] = useTransition();

  async function handleSearch(formData: FormData) {
    startSearch(async () => {
      const next = await searchCompanyContracts(workspaceId, state, formData);
      setState(next);
      setChecked(new Set());
    });
  }

  async function handleImport() {
    if (state.status !== "results") return;
    const selected = state.records.filter((r) => checked.has(r.detailId));
    if (selected.length === 0) return;
    startImport(async () => {
      await importSelectedContracts(workspaceId, selected);
    });
  }

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (state.status !== "results") return;
    setChecked(new Set(state.records.map((r) => r.detailId)));
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col gap-6 p-6">
      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">
            Import past contracts from e-GP
          </h1>
          <Link
            href="/workspaces"
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
          >
            Back
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          Search Bangladesh e-GP for contracts awarded to your company. Tick
          the rows that are yours and import them — no manual entry.
        </p>
      </header>

      <form action={handleSearch} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="companyName" className="text-sm font-medium">
            Company name
          </label>
          <p className="text-xs text-muted-foreground">
            Match is <span className="font-mono">Contains</span> — try the
            shortest distinctive word if the full legal name returns nothing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            id="companyName"
            name="companyName"
            type="text"
            required
            minLength={3}
            autoFocus
            placeholder="e.g. Beximco, Sayma"
            className="flex-1 rounded-md border px-3 py-2 text-sm"
          />
          <select
            name="workStatus"
            defaultValue="All"
            aria-label="Work status filter"
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="All">All</option>
            <option value="Completed">Completed</option>
            <option value="Ongoing">Ongoing</option>
          </select>
          <button
            type="submit"
            disabled={isSearching}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {isSearching ? "Searching…" : "Search"}
          </button>
        </div>
        {state.status === "error" ? (
          <p role="alert" className="text-sm text-red-600">
            {state.message}
          </p>
        ) : null}
      </form>

      {state.status === "results" ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <p className="text-sm text-muted-foreground">
              {state.records.length} result
              {state.records.length === 1 ? "" : "s"} for
              <span className="ml-1 font-mono">{state.query}</span>
            </p>
            {state.records.length > 0 ? (
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-muted-foreground underline hover:text-foreground"
              >
                Select all
              </button>
            ) : null}
          </div>

          {state.records.length === 0 ? (
            <>
              <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                No contracts found on e-GP for &quot;{state.query}&quot;. Try a
                different spelling or the shorter version of your company name.
              </div>
              {state.diagnostic ? (
                <details className="rounded-md border border-dashed p-4 text-xs">
                  <summary className="cursor-pointer text-muted-foreground">
                    Debug: raw response ({state.diagnostic.responseLength}{" "}
                    bytes, hasRowClass=
                    {String(state.diagnostic.hasRowClass)})
                  </summary>
                  <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-3 text-[10px] leading-relaxed">
                    {state.diagnostic.snippet}
                  </pre>
                </details>
              ) : null}
            </>
          ) : (
            <ul className="flex flex-col gap-2">
              {state.records.map((r) => (
                <li
                  key={r.detailId}
                  className="flex items-start gap-3 rounded-md border p-4 text-sm"
                >
                  <input
                    type="checkbox"
                    id={`chk-${r.detailId}`}
                    checked={checked.has(r.detailId)}
                    onChange={() => toggle(r.detailId)}
                    className="mt-1"
                  />
                  <label
                    htmlFor={`chk-${r.detailId}`}
                    className="flex flex-1 cursor-pointer flex-col gap-1"
                  >
                    <span className="font-medium leading-snug">{r.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {r.procuringEntity} · {formatDate(r.contractStartDate)}
                      {" — "}
                      {formatDate(r.contractEndDate)} · ৳
                      {idFmt.format(r.contractAmount)} · {r.workStatus}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      Cert: {r.experienceCertificateNo}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}

          {state.records.length > 0 ? (
            <button
              type="button"
              onClick={handleImport}
              disabled={isImporting || checked.size === 0}
              className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {isImporting
                ? "Importing…"
                : `Import ${checked.size} selected`}
            </button>
          ) : null}
        </section>
      ) : null}

      <footer className="text-xs text-muted-foreground">
        We fetch this data live from Bangladesh e-GP each time you search.
        Nothing is stored until you tick and import.
      </footer>
    </main>
  );
}
