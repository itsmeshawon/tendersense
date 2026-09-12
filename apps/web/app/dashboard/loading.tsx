/**
 * Dashboard skeleton. Renders instantly while the server component
 * runs its queries — turns a blank white flash into a shaped page
 * that feels far faster.
 */
export default function DashboardLoading() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8">
      <div className="flex flex-col gap-2">
        <div className="h-7 w-64 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-80 animate-pulse rounded-md bg-muted/70" />
      </div>

      <div className="grid grid-cols-3 divide-x divide-border/60 rounded-lg border border-border/70 bg-card">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-2 px-5 py-4">
            <div className="h-3 w-20 animate-pulse rounded bg-muted/70" />
            <div className="h-7 w-12 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-border/70 bg-card">
        <div className="flex items-baseline justify-between border-b border-border/60 px-5 py-4">
          <div className="h-5 w-48 animate-pulse rounded bg-muted" />
          <div className="h-3 w-16 animate-pulse rounded bg-muted/70" />
        </div>
        <div className="flex flex-col gap-3 px-5 py-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-4 flex-1 animate-pulse rounded bg-muted/70" />
              <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </section>

      {[0, 1].map((i) => (
        <section key={i}>
          <div className="mb-3 h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="rounded-lg border border-border/70 bg-card p-4">
            {[0, 1, 2].map((j) => (
              <div key={j} className="flex items-center gap-3 py-2.5">
                <div className="h-4 flex-1 animate-pulse rounded bg-muted/70" />
                <div className="h-4 w-24 animate-pulse rounded bg-muted/70" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
