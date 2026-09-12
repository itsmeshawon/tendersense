# 0013 — Amendment badges: red for deadline changes only, gray otherwise

**Status:** Accepted 2026-09-12
**Phase:** 2 (Discovery) v2 §Q4

## Context

The runner writes `opportunity_revisions` rows whenever the content_hash of an ingested opportunity changes. Phase 2 surfaces these on `/opportunities` as row badges + on `/dashboard` as a "Recent amendments" pane.

Per SoT §26, some changes are more consequential than others. A deadline extension changes whether the user can still bid; a typo in the description doesn't. If we render every amendment the same way, the user learns to ignore the badge.

## Decision

Two visual severities:

- **Red** ("Deadline changed"): the revision's `changed_fields` includes `deadline_at`.
- **Gray** ("Amended"): everything else.

This applies to both the `/opportunities` per-row badge and the `/dashboard` recent-amendments pane.

## Consequences

- Users treat red as "look at this now" and gray as "audit trail." Red retains meaning because it's rare.
- Requires the runner to compute `changed_fields` accurately. Phase 2 v2 shipped MVP-quality diffs for `deadline_at`, `title`, and `status` (persistence.ts extended in PR #39). Full-field diffing is a Phase 6 follow-up.
- The notification fan-out (`notifications.title`) uses the same rule: `"Deadline changed"` if `changed_fields` contains `deadline_at`, else `"Tender amended"`.

## Trapdoor

If the runner ever drops `changed_fields` computation (e.g., during a refactor), every amendment badge silently becomes gray. Guard: the runner test suite includes cases that assert `changed_fields.includes("deadline_at")` when the deadline is changed.
