# TenderSense — Master Spec Pointer

The canonical specification is composed of two documents in `raw/` (immutable):

- **`TenderSense_MVP_Source_of_Truth.md`** — v0.2, 2026-09-11. The base spec.
- **`TenderSense-SOT-Changes (1).md`** — 2026-09-09 revision. Delta on ordering, scope, and vocabulary.

Where the two documents disagree, the changes doc wins. `decisions/0006-sot-2026-09-09-scope.md` concentrates the delta into an actionable ADR so readers don't have to hold both files in their head.

## Phase index (SoT §113, revised per changes doc)

| Phase | Title | Plan | Status |
|---|---|---|---|
| 0 | Foundation | `proposals/active/phase-0-foundation/plan.md` | **DONE** — tag `v0.1.0-phase0` (2026-09-11) |
| 1 | Source ingestion — **WB + e-GP notices + eExperience lookup** | `proposals/active/phase-1-source-ingestion/plan.md` | drafting → awaiting approval |
| 2 | Discovery — **+ BPPA + NOA + APP adapters** | — | not started |
| 3 | Matching — grade + decision (A/B/C/D), no percentages | — | not started |
| 4 | Assessment — checklist with hard-fail, no eligibility % | — | not started |
| 5 | Collaboration — **single-user Pro only for MVP; teams post-MVP** | — | not started |
| 6 | Alerts / reporting — **revisions + digest only for MVP; reports post-MVP** | — | not started |

Definition of MVP Done: SoT §114 (subject to scope cuts in ADR 0006 §7).
