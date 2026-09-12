# 0016 — Four SoT §19.2 signals deferred out of Phase 3

**Status:** Accepted 2026-09-12
**Phase:** 3 (Matching) v2 §2a

## Context

SoT §19.2 sketched nine scoring dimensions. Phase 3 plan v2 §2 shipped five. This ADR records the four that were cut and the trigger for each to come back — so nothing gets silently forgotten.

## Signals cut, with recovery paths

### Credential signal (weight 5)

**Why cut:** the `credentials` table isn't in the schema until Phase 4. A dimension whose data source doesn't exist always marks itself `applicable: false` and redistributes to zero — dead weight.

**Where it goes:** Phase 4 Assessment. When the `credentials` table lands, a new ADR at that time will:
1. Reinstate the signal (weight likely 5–10)
2. Rebalance the six-dim weights back to 100
3. Bump `SCORING_VERSION` so old matches can be identified and rescored

### Source preference (weight 5)

**Why cut:** `monitoring_profiles.source_keys` already **filters** what enters the feed. Scoring on it a second time only rewards opportunities for having survived the filter that admitted them — no product-meaningful discrimination.

**Where it goes:** post-MVP, only if a "preferred vs allowed" distinction is added to monitoring profiles (e.g., a user allows all sources but *prefers* WB). Not filed as a dependency — a note.

### Procurement method preference (weight 5)

**Why cut:** same filter-vs-score redundancy as source preference.

**Where it goes:** same conditions as source preference. Post-MVP if the profile UI ever distinguishes preferred vs allowed methods.

### Timeline suitability (weight 5)

**Why cut:** grade should mean *fit*; deadline should mean *urgency*. Phase 2 already surfaces urgency directly on `/opportunities` via the colorized days-remaining chip and the `deadline_asc` sort. Folding urgency back into the grade would dilute both axes.

**Where it goes:** stays separate from grade **unless** the deadline chip/sort is ever removed from row UI. In that case, this signal would need to be re-folded back into scoring to avoid losing the urgency information entirely.

## Recovery discipline

When any of these come back:

1. Update `DIMENSION_WEIGHTS` in `lib/matching/types.ts` — sum must still equal 100.
2. Add the signal function to `lib/matching/signals.ts`.
3. Bump `SCORING_VERSION`.
4. Add tests analogous to the existing signal tests.
5. New ADR restating the reintroduction rationale so this ADR's decision doesn't just get overwritten in git history.

## What was kept

Five dimensions summing to 100 — see ADR 0015.
