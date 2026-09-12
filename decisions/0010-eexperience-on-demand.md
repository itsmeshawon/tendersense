# ADR 0010 — eExperience is an on-demand lookup, not a cron adapter

**Status:** Accepted · **Date:** 2026-09-12 · **Phase:** 1

## Context

Bangladesh e-GP publishes three related but distinct surfaces about awarded contracts:

- **eExperience** — a company's own past contracts, keyed by company name. Includes procurement-entity certificate numbers. Public search UI.
- **eContracts / NOA** — who won what, for how much. The "other companies' wins" surface.
- **APP** (Annual Procurement Plans) — upcoming procurement planned by each government office.

SoT-Changes 2026-09-09 (ADR 0006 §2) split these three into separate deliverables. Only **eExperience** is on the Phase 1 critical path. It powers the "type your company name → see your contracts appear → tick the ones that are yours" onboarding demo — the moment that unlocks non-empty workspace profiles at zero manual-entry cost.

Question: does eExperience get treated like the other adapters (cron, source_records, revision tracking) or is it different?

## Decision

**On-demand lookup only.** No cron, no source_records, no revision tracking, no watermark.

Concrete shape (Phase 1 PR #8 in the plan sequence):

```
apps/web/lib/experience/
  egp-experience-client.ts    # single lookupByCompanyName(name) function
  types.ts                    # ExperienceRecord shape
```

Flow:

1. During workspace profile setup, user types their company name.
2. Server action calls `lookupByCompanyName(name)`.
3. `lookupByCompanyName` hits e-GP's public eExperience URL, parses the response, returns `ExperienceRecord[]`.
4. Frontend renders a tick-list.
5. Ticked rows write into `public.projects` (SoT §16.9) — that table's `evidence_credential_number` column carries the e-GP certificate reference.

## Consequences

- **No `sources` row for eExperience.** The `sources` registry is for cron-driven adapters. eExperience isn't one.
- **No `source_records` entries.** We don't need to store what we didn't schedule.
- **No revision tracking.** If e-GP updates a company's record, the next user-triggered lookup will fetch the fresh version. Nobody is watching this over time.
- **No adapter contract.** `ProcurementSourceAdapter` (ADR 0007) doesn't apply — that interface is designed around the runner. eExperience gets its own simple function surface.
- **Rate-limit courtesy is per-user.** A workspace can look up its own name a handful of times. Add a per-workspace daily cap (Phase 1 plan §6 Q10) to prevent hammering — proposed 20/day/workspace but not yet locked.
- **Cache locally in the browser session.** If a user searches "Acme Corp" and types it again, we re-hit e-GP. That's fine for MVP but a short server-side cache (`SELECT ... FROM cache WHERE company=name AND fetched_at > now() - '1 hour'`) is cheap to add later.
- **Fits cleanly under the PII rule (ADR 0006 §8).** eExperience results are the workspace's own contracts, not third-party officials. The PII stance for procuring-entity officials in notice pages doesn't apply here — different data, different provenance.

## Alternatives considered

- **Bulk crawl + cache.** Rejected — the whole eExperience register is huge, the workspace only wants their own rows, and a nightly crawl of the whole register is wildly disproportionate.
- **Reuse `source_records`.** Rejected — that table's semantic is "raw notice for later re-normalize," which doesn't fit an on-demand lookup with no scheduled re-ingest.
- **Full adapter treatment.** Rejected — brings runner, watermark, revision-detection complexity for zero benefit. The Phase 1 plan §5 sequence explicitly separates this PR from the cron-adapter sequence.

## When to revisit

- If we need to trend "how many contracts has this company won over time," we'd start persisting into a proper `experience_records` table with revision tracking. Product hasn't asked for that.
- If eExperience URL/selectors change repeatedly (parser drift), the on-demand call still works — a user-triggered lookup that returns "we couldn't parse" is a better UX than a broken cron job silently poisoning `source_records`.
- eContracts (NOA) — the "who won similar work" companion feature — will use the same on-demand pattern initially. Only APP has any reason to be cron-driven (it's a batch of yearly plans that appear on a predictable schedule).
