# ADR 0009 — Cron infrastructure: GitHub Actions, not pg_cron

**Status:** Accepted · **Date:** 2026-09-12 · **Phase:** 1

## Context

Ingestion runs on a schedule. The candidate mechanisms:

1. **GitHub Actions cron** (SoT §8.1 default) — YAML workflow, ubuntu-latest runner, runs `npm run sync:<source>` on schedule.
2. **Supabase `pg_cron`** — Postgres extension, cron jobs run inside the DB, callable via SQL or `net.http` extension.
3. **Supabase Scheduled Edge Functions** — Deno function invoked on schedule, has full HTTP + service_role access.
4. **External cron service** (Upstash Scheduled Workflows, cron-job.org, etc.) → Route Handler.
5. **Vercel Cron** — Route Handler pinged by Vercel on schedule.

Each has trade-offs on where the code lives, how logs surface, how failures are visible, and how much they cost.

## Decision

**GitHub Actions cron** for Phase 1. Two workflows:

- `.github/workflows/sync-worldbank.yml` — daily 02:00 UTC
- `.github/workflows/sync-egp.yml` — every 4h

Both use `workflow_dispatch: {}` for manual re-runs from the Actions UI. Both call the standard TypeScript entry points under `apps/web/scripts/`.

## Consequences

- Ingestion code lives in the same repo, same language, same test setup as the app. No context-switch to Deno or SQL.
- Logs are in the GitHub Actions UI. Failure = red X + email. Manual re-run is a button.
- Cost: within the free 2000 min/mo cap even at every-4h + daily.
- Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` in the repo's Actions Secrets. No new secret plane.
- Failure mode: if GitHub Actions has an outage, we lose that ingestion tick. Runner idempotency + watermark advance-on-success-only means the next tick catches up cleanly.
- Ingestion is decoupled from the app's request path. Vercel Cron would tie ingestion to app availability + Vercel runtime limits (10s default, longer on Pro). Ingestion runs can be minutes; putting them in the request path fights the platform.

## Alternatives considered

- **Vercel Cron.** Rejected — ties ingestion to app runtime + Vercel's function timeout ceilings. Also, keeping ingestion out of `apps/web`'s route surface means one less attack surface and one less thing to accidentally expose to authenticated users.
- **pg_cron.** Rejected — SQL callouts to external HTTP via `net.http` work, but the code lives in migrations, not TypeScript. Debugging + testing pain not worth the "it runs in the DB!" upside.
- **Scheduled Edge Functions.** Rejected — Deno + TypeScript would need a separate build + test setup. Same runtime distance problem as pg_cron. Also: SoT §8.1 explicitly lists GitHub Actions cron as the default.
- **External cron.** Rejected — one more account, one more secret, one more thing that goes down.

## When to revisit

- If a WB or e-GP sync run takes longer than 6h, GitHub Actions' job timeout is 6h. Split the work by cursor page range.
- If ingestion needs to trigger in response to a webhook (not a schedule), that's a different mechanism (Route Handler with a shared secret) and doesn't change this decision.
- If we ever need sub-minute cadence, GitHub Actions cron's 5-minute minimum forces the move to something else.
