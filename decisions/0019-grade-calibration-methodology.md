# 0019 — Grade calibration: lightweight labeling + `scoring_version` telemetry

**Status:** Accepted 2026-09-12
**Phase:** 3 (Matching) v2 §3.5

## Context

The scoring model ships with weights informed by SoT §19.2 intuition, not data. Whether the grades feel right to a real bid team can only be verified by running the model against real tenders and comparing to what the team would actually bid on.

The original plan called for hand-labeling 40 tenders + tuning until 80% agreement — but that is unrealistic. Humans disagree with each other more than 20% on the D/C boundary; the metric is theatre.

## Decision

**Lightweight calibration, not a release gate:**

1. **Ship SoT weights unchanged** at `SCORING_VERSION = 1`.
2. **Every match row stores `scoring_version`** so a future retune is observable in the data.
3. **Book one working session with BRAC IT's bid team** (~45 min):
   - Pull 12 tenders from `public.opportunities` that have `bd_egp` or `bd_bppa` source and non-trivial scores (drawn from A/B/C/D bands proportionally).
   - Ask the bid lead a single question per row: *"Would you bid on this? Yes / No / Maybe."*
   - Compare to the computed grade. Write the answer + reasoning into `docs/grade-calibration.md`.
4. **Adjust only for systematic bias.** If sector, capability, or country is systematically over/underweighted, edit `DIMENSION_WEIGHTS`, bump `SCORING_VERSION`, ship a follow-up PR. If the disagreements look random (e.g., "we would bid on that C because of a specific relationship"), document as known limitations and don't retune.
5. **No agreement-rate percentage bar.** The output of the calibration session is either a weight update PR *or* a documented "these weights hold, here's what we know they miss."

## What lives in `docs/grade-calibration.md`

- The 12 labeled tenders (title, source, computed grade, bid-team verdict, notes)
- A brief "what we learned" section
- The `SCORING_VERSION` in effect at labeling time
- Any weight adjustments made as a result

## Observing calibration in production

`scoring_version` on every `opportunity_matches` row makes it possible to answer questions like:

- *"After we bumped to v2, did A-grade tenders become more accurate?"*
- *"Are D-grade counts stable or drifting?"*
- *"When did we last retune, and what changed?"*

The data is the audit trail. The doc is the human-readable narrative.

## Consequences

- Phase 3 tag `v0.4.0-phase3` does **not** wait on calibration. Calibration is a follow-up sprint after the tag, once the pilot is live and there are humans to label.
- If BRAC IT's bid team is unavailable, the tag still ships. Calibration is a nice-to-have for pilot conversion, not a release gate.
- If a much larger user base emerges, we may want a more rigorous calibration methodology (e.g., inter-annotator agreement across multiple companies). Not needed for a single-pilot MVP.
