export default function WorkspacesLoading() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted/70" />
        </div>
        <div className="h-9 w-36 animate-pulse rounded-md bg-muted" />
      </div>
      <ul className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <li
            key={i}
            className="h-24 animate-pulse rounded-lg border border-border/70 bg-card"
          />
        ))}
      </ul>
    </main>
  );
}
