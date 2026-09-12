# 0020 — Eligibility separated from grade on `opportunity_matches`

**Status:** Accepted 2026-09-13
**Phase:** 4 (Assessment) v2 §2b

## Context

Phase 3 collapsed both signals into a single `grade` enum, with `not_eligible` as a short-circuit value. That worked when eligibility was a crude keyword check, but Phase 4 introduces a real per-requirement evaluator with a 5-status set (SoT §22). Overloading `grade` would erase the honest four-quadrant view — `A + PASS` (great match, ready to bid), `A + FAIL` (great match, missing a mandatory credential), `C + PASS` (weak match but eligible), `D + FAIL`. All four are meaningful; a single enum can't express them.

## Decision

Add `eligibility` and `eligibility_computed_at` columns to `public.opportunity_matches` (migration 0028). Enum: `pass · partial · needs_verification · fail · not_evaluated`. Existing rows with `grade = 'not_eligible'` migrate to `eligibility = 'fail'` + `grade = 'D'`. The `not_eligible` check-constraint value stays for now to avoid breakage during transition; a later migration drops it once no code path emits it.

## Consequences

- `GradeChip` renders `grade` only. New `EligibilityChip` renders `eligibility` alongside. Both surfaces on the list + detail views (Phase 4 PR #10).
- `SoT §6` reserves an "Eligibility" tab on Opportunity Detail — implemented in Phase 4 PR #8.
- Assessment runner writes the eligibility signal back onto matches after each successful run (PR #11) so the list chip stays fresh without a full recompute.
