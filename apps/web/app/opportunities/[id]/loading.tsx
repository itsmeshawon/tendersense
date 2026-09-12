export default function OpportunityDetailLoading() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <div className="flex flex-col gap-2">
        <div className="h-3 w-40 animate-pulse rounded bg-muted/70" />
        <div className="h-8 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-60 animate-pulse rounded bg-muted/70" />
      </div>
      <div className="h-10 w-96 animate-pulse rounded-md bg-muted/70" />
      <div className="h-64 animate-pulse rounded-lg border border-border/70 bg-card" />
      <div className="h-40 animate-pulse rounded-lg border border-border/70 bg-card" />
    </main>
  );
}
