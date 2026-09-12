export default function OpportunitiesLoading() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <div className="flex flex-col gap-2">
        <div className="h-7 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-96 animate-pulse rounded-md bg-muted/70" />
      </div>
      <div className="h-48 animate-pulse rounded-lg border border-border/70 bg-card" />
      <div className="h-3 w-40 animate-pulse rounded bg-muted/70" />
      <ul className="flex flex-col gap-3">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <li
            key={i}
            className="rounded-lg border border-border/70 bg-card p-4"
          >
            <div className="flex items-baseline justify-between gap-4">
              <div className="h-5 flex-1 animate-pulse rounded bg-muted" />
              <div className="flex gap-2">
                <div className="h-5 w-24 animate-pulse rounded-full bg-muted/70" />
                <div className="h-5 w-16 animate-pulse rounded-full bg-muted/70" />
              </div>
            </div>
            <div className="mt-3 h-3 w-80 animate-pulse rounded bg-muted/70" />
          </li>
        ))}
      </ul>
    </main>
  );
}
