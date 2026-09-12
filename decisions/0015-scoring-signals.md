# 0015 — Matching scoring model: 5 signals summing to 100

**Status:** Accepted 2026-09-12
**Phase:** 3 (Matching) v2 §2

## Context

SoT §19.2 sketched a 9-dimension weighted-sum scoring model for opportunity matches (Grade A/B/C/D + Not eligible + Need more info per ADR 0006 §5). During plan review (session 19), we trimmed the model.

## Decision

**Five in-scope scoring dimensions, weights summing to 100:**

| Dimension | Weight | Signal source |
|---|---|---|
| Capability | 35 | `workspace_capabilities` ∩ opportunity keywords |
| Sector | 20 | `monitoring_profiles.sectors` ∩ `opportunities.sector[]` |
| Keyword | 20 | `monitoring_profiles.keywords` hitting title/description (word-boundary aware) |
| Past project | 15 | Title-token overlap with `projects.name` |
| Country | 10 | `monitoring_profiles.country_codes` ∋ `opportunities.country_code` |

Locked in `apps/web/lib/matching/types.ts` as `DIMENSION_WEIGHTS`. `SCORING_VERSION = 1`.

## Redistribution rule

If a dimension's input is missing on the workspace or opportunity side, it is marked `applicable: false`. The final score is:

```
score = (sum of contributions across applicable dimensions)
        / (sum of weights across applicable dimensions)
        × 100
```

This is the "ambiguity rule" (plan §2): a workspace with no declared capabilities should *not* have those 35 points silently zeroed — they redistribute across the dimensions where signals exist. Empty-profile short-circuits to `need_more_info` instead of a false-D verdict.

## Grade mapping (ADR 0006 §6)

- **A — Strong fit**: score ≥ 85
- **B — Good fit**: score ≥ 70
- **C — Possible**: score ≥ 50
- **D — Weak fit**: score < 50
- **Not eligible**: excluded_keyword hit (short-circuit before scoring)
- **Need more info**: empty profile (short-circuit before scoring)

Constants live in `lib/matching/types.ts` `GRADE_BOUNDARIES` — one file, one grep to change.

## Consequences

- Cutting from 9 to 5 dimensions removes signals that were dead weight in prod (see ADR 0016 for what was cut and why).
- The 35-point capability weight makes it the dominant signal — Phase 3 plan §2b addresses the cold-start problem by auto-deriving capabilities from imported eExperience projects.
- Every match row stores `scoring_version` so a future weight retune is observable in the data (post-launch calibration methodology — ADR 0019).
