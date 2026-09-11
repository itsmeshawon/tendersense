# ADR 0007 — Ingestion: runner-as-orchestrator, adapters as data

**Status:** Accepted · **Date:** 2026-09-12 · **Phase:** 1

## Context

Every source adapter (World Bank, e-GP, and any future one) does the same shape of work: paginate, fetch, normalize, dedupe, write. The question is whether each adapter owns that whole flow, or whether a shared runner drives it and adapters only supply the source-specific bits.

If every adapter owns its whole flow:

- The upsert logic, revision-detection logic, `source_sync_runs` bookkeeping, and watermark-advancement rules get duplicated per adapter.
- Any bug or policy change (e.g. "on failure, don't advance the watermark") has to be applied N times.
- Two adapters can silently diverge on subtle semantics.

## Decision

- **One runner** in `apps/web/lib/ingest/runner.ts`. Orchestrates: begin `source_sync_runs` row → loop `fetchPage` → normalize → upsert `source_records` + `opportunities` → compare hashes → save `opportunity_revisions` on material change → advance watermark on success → finalize `source_sync_runs`.
- **Adapters are data.** They implement `ProcurementSourceAdapter` from `apps/web/lib/ingest/types.ts`:
  - `fetchPage(cursor?)` — HTTP + pagination
  - `normalize(record)` — source-specific field mapping to `NormalizedOpportunity`
  - `healthCheck()` — cheap "am I reachable" probe
  - Optional `fetchDetails(record)` for the two-request pattern (list + detail)
- Adapters never touch the DB. The runner never knows how a source paginates.

## Consequences

- New source = one file (`adapters/<name>.ts`) + one entry in the source registry migration. Fully additive; no cross-cutting changes.
- Runner is the single testable surface for "what happens on partial failure," "how do we tell a revision from a fresh record," "what makes a run 'success' vs 'partial'."
- Runner tests use a fake adapter emitting scripted pages; no HTTP mocking needed for runner tests.
- Failure mode when we hit adapter-specific edge cases: an adapter has to grow a hook back into the runner. Keep the interface small until forced.

## Alternatives considered

- **Adapter-owns-run.** Rejected — duplicated bookkeeping, guaranteed drift.
- **Framework-heavy pipeline library.** Rejected — no library gets us more than 200 lines of hand-written orchestration would, and it locks us into someone else's failure model.
- **Job queue (BullMQ etc.).** Rejected as premature. GitHub Actions cron + a synchronous runner is enough at Phase 1 scale.
