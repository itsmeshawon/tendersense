# 0023 — Async execution: `jobs` table + 5-minute cron worker

**Status:** Accepted 2026-09-13
**Phase:** 4 (Assessment) v2 §2e

## Context

Phase 4 introduces the first work that can't fit in a request cycle: parsing uploaded evidence PDFs (Phase 4.5). Assessment runs themselves are fast (rules + evaluator, single-digit seconds) so they stay synchronous in the server action, but the codebase needs a general async pattern before evidence upload lands.

## Decision

- Add `public.jobs` table with `type · payload · status · attempts · scheduled_for · locked_by · locked_at · result · error` columns (migration 0026).
- One job type in MVP: `document.extract` (parse uploaded evidence into `extracted_text`). Others (`report.generate`, `digest.send`) land as Phase 5+ needs them.
- A new GitHub Actions workflow `.github/workflows/process-jobs.yml` runs every 5 minutes, calls the same worker entrypoint used by existing sync workflows, drains pending jobs in FIFO order.
- Locking via `locked_by`/`locked_at` + a `for update skip locked` claim query; expiry on `locked_at` older than 15 minutes so a crashed runner doesn't strand jobs.

## Consequences

- Established pattern for anything else that needs async (LLM extraction if reactivated, bulk exports, scheduled digests).
- Assessment runner does **not** use jobs — it's fast enough synchronously and keeping it in-request avoids a UX regression (user clicks "Run" and gets an answer, no polling).
- Cron freq is generous (5 min) — this is not a real-time queue. Bump if pilot needs it.
