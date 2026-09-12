# 0021 — Recommendation vocabulary: 4-way display + 5-way internal

**Status:** Accepted 2026-09-13
**Phase:** 4 (Assessment) v2 §2c

## Context

SoT §24 defines a 5-way recommendation set: `strong_pursue · potential_pursue · needs_review · high_risk · likely_decline`. Good for reports, too many for a UI chip. The bid team wants a decisive nudge (`Bid` / `Verify` / `Hold` / `Skip`), not a five-point spectrum they have to translate.

## Decision

Store the SoT 5-value reason as `assessments.recommendation_reason`. Derive a 4-value display via a fixed mapping:

| Reason | Display |
|---|---|
| `strong_pursue` | `BID` |
| `potential_pursue` | `BID` |
| `needs_review` | `VERIFY` |
| `high_risk` | `HOLD` |
| `likely_decline` | `SKIP` |

Both columns live on `assessments`. UI reads `recommendation`; reports/exports use `recommendation_reason` for the finer distinction.

## Consequences

- Two chips, one strong verdict, no ambiguity for the pilot user.
- If a future customer wants the 5-way UI, flip a per-workspace preference — the data is already there.
- Derivation logic in `lib/assessment/score.ts::deriveReason` + `REASON_TO_DISPLAY`; tests pin the mapping.
