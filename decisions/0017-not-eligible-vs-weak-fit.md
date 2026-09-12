# 0017 — `not_eligible` must render distinctly from `D — Weak fit`

**Status:** Accepted 2026-09-12
**Phase:** 3 (Matching) v2 §2a + SoT-Changes-2026-09-09 #2

## Context

Two of the six grade values (ADR 0006 §5) map to "the user probably shouldn't bid":

- **D — Weak fit**: the scoring engine gave the tender a low score against this workspace's profile. The user *could* bid but the signals are weak.
- **Not eligible**: a make-or-break disqualifier fires — currently one of the workspace's `excluded_keywords` matched the tender's title/description. In Phase 4, missing mandatory credentials will also produce this verdict.

If these two render the same in the UI, users learn to skim past both — including the "Not eligible" tenders they might have overridden as "I want to bid anyway."

The SoT changes note (2026-09-09, item #2) called this out explicitly.

## Decision

**Render them distinctly.** In `components/GradeChip.tsx`:

- **D — Weak fit**: gray border, standard chip
- **Not eligible**: dashed border, strikethrough text, gray but visually "closed" — clearly a different affordance than a low grade

The letter never appears alone. Every chip renders `"A — Strong fit"` / `"B — Good fit"` / `"C — Possible"` / `"D — Weak fit"` / `"Not eligible"` / `"Need more info"` in full. Users don't have to remember that D is "weak fit" (as opposed to, say, "did not consider"). Words carry the meaning.

## Consequences

- The vocabulary is fixed at 6 chip variants. Adding new ones requires an ADR update.
- Not-eligible has no numeric score display (the score is 0 by construction from the short-circuit); D shows `(score/100)` in the popover for calibration transparency.
- The scoring engine (`lib/matching/score.ts`) short-circuits before running the weight combiner when an `excluded_keyword` hits — so a Not-eligible verdict is never a "low-score D" masquerading as ineligibility.

## Related

- ADR 0006 §5: grade vocabulary
- ADR 0015: scoring signals (where Not-eligible short-circuit lives in code)
