# 0024 — Assessment quota: 5/month free, unlimited Pro

**Status:** Accepted 2026-09-13
**Phase:** 4 (Assessment) v2 §2f

## Context

Detailed assessment is the most compute-visible product surface. Without a quota, a free workspace could run hundreds per month and the pilot economics break down. It also needs to be a Pro-tier gate to make the paid plan worth buying.

## Decision

- `FREE_MONTHLY_LIMIT = 5` — an even 5 per calendar month. Encoded as a config constant in `lib/assessment/quota.ts`, bumpable in a single-line PR.
- **Pro plan: unlimited** — the counter still increments for observability but never enforces a cap.
- Counters live in `public.workspace_usage` keyed by `(workspace_id, period_month)` (migration 0027). Members can read; only service_role writes.
- Enforced server-side in `runAssessmentAction`: it reads usage, throws `QuotaExceededError` when exhausted (surfaces in the button's inline error text), and increments only after a successful run.
- Failed runs don't decrement — a failed run consumed no material work, so the quota is preserved.

## Consequences

- Predictable pilot cost: worst case 5 × N free workspaces × ~1s CPU per run = negligible.
- Upgrade nudge is concrete: "You've used 5 of 5 this month. Upgrade to Pro for unlimited."
- Counter resets at month boundary (`YYYY-MM-01` UTC). No proration; a free user who upgrades mid-month gets unlimited from that point.
