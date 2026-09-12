# Plan: Phase 3 — Matching

**Tier:** MewKing
**Status:** Draft v2 (2026-09-12) — scoring model trimmed 9→5 dimensions, calibration gate softened, cold-start auto-derive added
**Master spec:** `raw/TenderSense_MVP_Source_of_Truth.md` + `raw/TenderSense-SOT-Changes (1).md`
**SoT sections:** §7.5 Match, §16.18 opportunity_matches, §19 Matching Engine, §24 Recommendation
**Governing ADR:** `decisions/0006-sot-2026-09-09-scope.md` §5 (grade + decision, no percentages) and §6 (hardcoded thresholds)
**Exit criteria (SoT §113):** *"user understands why opportunities are shown"*

---

## 1. Scope

**This is the phase where TenderSense becomes tender-sensing.** BRAC IT logs in, and every opportunity has a grade against their profile. The two peaks of the pilot demo already work (eExperience unlock + Discovery feed) — Phase 3 makes the product's promise real.

**In scope:**

- **`opportunity_matches` table** (SoT §16.18) — per-workspace precomputed match rows with grade + reasons
- **Deterministic scoring engine** — no LLM (SoT §19.1). Weighted-sum model across **5** categories (trimmed from SoT §19.2's original 9 — see §2a for rationale + deferrals)
- **Grade vocabulary + escape hatches** (ADR 0006 §5):
  - **A — Strong fit** (85–100)
  - **B — Good fit** (70–84)
  - **C — Possible** (50–69)
  - **D — Weak fit** (0–49)
  - **Not eligible** — a make-or-break requirement fails (separate row state)
  - **Need more info** — profile is missing something material
- **Explainability panel** per row — the top positive + negative reasons (SoT §19.4)
- **Grade-boundary constants** in one file (ADR 0006 §6)
- **Cold-start auto-derive of capabilities** from imported eExperience projects (see §2b) — fresh workspaces get a starter profile without manual entry
- **Recompute triggers** (2 paths, not 3 — see §3.3): new-opportunity + workspace-profile change
- **`/opportunities` upgrade**: sort-by-grade default for logged-in workspaces, grade chip per row, "Why this?" popover
- **Profile capabilities UI** — `workspace_capabilities` table (SoT §16.8) already ready; add CRUD

**Not in scope for Phase 3 (moved to Phase 4):**

- Assessment-per-opportunity (deeper qualification, LLM-based, consumes quota)
- Requirement extraction from the notice text
- Evidence linking + gaps
- Quota enforcement

## 2. The scoring model (SoT §19.2, refined per ADR 0006 §2)

**Total = 100 points across five dimensions.** If a dimension is data-missing, redistribute proportionally.

| Dimension | Weight | Signal source |
|---|---|---|
| Service / capability match | 35 | Workspace capabilities ∩ opportunity keywords |
| Sector match | 20 | Workspace sectors ∩ opportunity sector[] |
| Keyword similarity | 20 | Title/description tokens ∩ workspace keywords |
| Past project similarity | 15 | Uses `public.projects` — imported eExperience contracts + manual entries |
| Country / market match | 10 | Workspace country ∈ opportunity country |

### 2a. Deferred / cut signals — for the record

Four signals from SoT §19.2's original nine were cut from Phase 3 MVP. Each is recorded here so a future phase or session can restore them without re-deriving the reasoning:

| Signal | Original weight | Why cut in Phase 3 | Where it goes |
|---|---|---|---|
| Credential signal | 5 | No `credentials` table until Phase 4; would always redistribute to zero | **Phase 4** — restore when Phase 4 ships the `credentials` schema. New ADR at that time, weight rebalance across all six dimensions. |
| Source preference | 5 | Monitoring profile already **filters** on `sources[]` (SoT §16.16) — anything reaching the feed passed the gate; scoring is redundant | **Post-MVP** — if we ever add a "preferred vs allowed" distinction to monitoring profiles, revisit. Not a filed dependency, just a note. |
| Procurement method preference | 5 | Same as source — filter-vs-score redundancy | **Post-MVP** — same conditions as source preference |
| Timeline suitability | 5 | Grade = *fit*, deadline = *urgency*. Phase 2 already surfaces urgency via colorized days-remaining chip + deadline sort on `/opportunities` | **Keep separate.** Only revisit if the deadline chip/sort is ever removed from row UI (would then need to re-fold urgency into grade to avoid losing the signal). |

Recorded as ADR 0016 (see §4).

### 2b. Cold-start capability auto-derive

A fresh workspace with no capabilities + no projects + no history renders "Need more info" for every opportunity — day-one demo dies on the vine. Phase 3 solves this in-scope, not as a "consider":

- After eExperience import (Peak 1) writes rows to `public.projects`, run `deriveCapabilitiesFromProjects(workspaceId)`:
  - Bucket each project's `title + description` against the 10-item capability taxonomy (SoT §16.7 seed)
  - Insert any capability bucket that matches ≥ 1 imported project into `workspace_capabilities` with `source='auto_derived'`
- User can review + remove in the capabilities tab; a "suggested" badge distinguishes auto-derived from user-added

Cost: ~40 lines pure function + a follow-up write in the import server action. Payoff: first-login demo shows scored feed instead of "complete your profile" wall.

### Grade mapping

Total score → grade band:

```ts
export const GRADE_BOUNDARIES = {
  A: 85,   // Strong fit
  B: 70,   // Good fit
  C: 50,   // Possible
  D: 0,    // Weak fit
} as const;
```

**One file, one constant, one grep to change** — locking ADR 0006 §6 in code.

### Not-eligible short-circuit

Before scoring:
- If workspace has an explicit "excluded_keywords" in monitoring profile and the title/description matches → **excluded, not shown**
- If workspace declared a mandatory credential (Phase 4) that the opportunity requires and the workspace doesn't have → **Not eligible** (still shown on shortlists, but never in the ranked feed). *Note: this branch is inert in Phase 3 (no credentials table); it activates in Phase 4.*

### Need-more-info short-circuit

- If workspace has zero capabilities (after auto-derive) + zero projects + zero declared sectors → **Need more info**, all opportunities render with a "Complete your profile" CTA instead of a grade.

### Ambiguity

Do not silently treat "unknown" as zero. Redistribute weights across only the dimensions where signals exist. This matches ADR 0006 §4 (Phase 4 rule) — don't manufacture false certainty.

## 3. Deliverables

### 3.1 Schema (migrations 0016–0017)

- `0016_opportunity_matches.sql` — SoT §16.18. Unique on (workspace_id, opportunity_id). Includes: `score smallint`, `grade text check ('A','B','C','D','not_eligible','need_more_info')`, `reasons jsonb`, `concerns jsonb`, `scoring_version int`, `computed_at timestamptz`. RLS: workspace members read their own.
- `0017_workspace_capabilities.sql` — SoT §16.8 (already in the SoT but not migrated in Phase 0). Includes `source text` (`'user'` | `'auto_derived'`) to distinguish suggestions. RLS: is_workspace_member.

### 3.2 Scoring library

Under `apps/web/lib/matching/`:

- `types.ts` — `MatchGrade`, `MatchReason`, `MatchInput` shapes
- `signals.ts` — pure functions per dimension (5 signals). Each returns `{ weight, matched, evidence }`
- `score.ts` — combines signal outputs → total → grade
- `explain.ts` — turns signal outputs into a top-N reasons list for UI
- `recompute.ts` — orchestrates: for a workspace + set of opportunities, compute + upsert `opportunity_matches`
- `capability-derive.ts` — cold-start helper (§2b); pure function taking projects[] → capability[]

Fully unit-testable — no I/O. Sample-input tests against a hand-labeled set of ~12 realistic BRAC IT scenarios.

### 3.3 Recompute triggers

Two ways matches get recomputed (down from three — on-demand API deferred, see §11):

- **New opportunity lands** — runner (Phase 1) calls `recomputeForOpportunity(opportunityId)` after upsert, which computes matches for every workspace that has a monitoring profile matching this source/country/nature. Async, best-effort.
- **Workspace profile changes** — server action from `/monitoring`, `/workspaces/[id]/profile`, or eExperience import triggers `recomputeForWorkspace(workspaceId)` — scans last 90 days of opportunities.

Long-running recomputes are chunked (100 opportunities per pass) to stay inside Vercel serverless timeout.

### 3.4 UI

- **`/opportunities` upgrades:**
  - Grade chip per row: `A — Strong fit` (green), `B — Good fit` (blue), etc.
  - Not-eligible rows shown grayscale with reason: "Excluded because [reason]"
  - Need-more-info state hides the grade and shows profile-completion CTA
  - "Why this grade?" popover expanding to top-3 positive + top-2 negative reasons
  - Sort default flips to grade-desc when a workspace is active
- **`/workspaces/[id]/profile` new tab: Capabilities**
  - Multi-select from `capabilities` taxonomy (SoT §16.7) — pre-seeded from SoT list
  - Auto-derived capabilities appear with a "suggested" badge; user can promote to confirmed or remove
  - Add / remove
  - Impact preview: "10 more opportunities become A/B if you add ERP"

### 3.5 Grade calibration (lightweight — not a release gate)

- Draft a `docs/grade-calibration.md` with **~12 hand-labeled tenders** from BRAC IT's history (Peak 1 imports work for this — real e-GP data). One working session with the bid team, not a multi-week exercise.
- Compare each label ("we would/wouldn't bid") to computed grade
- **Document disagreements** with reasoning; adjust weights if a systematic bias is visible, otherwise accept as known-limitation and iterate post-launch
- No agreement-rate percentage bar (humans disagree with each other more than 20% on the D/C boundary — the metric was theatre)
- Every match written carries `scoring_version` — post-launch iteration becomes a natural retune with real usage data

Per ADR 0006 §6: hardcoded, not user-configurable, but revisited on data.

## 4. Decisions to record as ADRs

- `0015-scoring-signals.md` — the **5** dimensions and their weights (locks §2 above)
- `0016-deferred-scoring-signals.md` — the 4 cut signals + where each one goes (locks §2a — the recovery path)
- `0017-not-eligible-vs-weak-fit.md` — why they're distinct rows (per SoT-Changes #2 warning: "D and 'not eligible' must not look the same")
- `0018-recompute-triggers.md` — two trigger paths; batching strategy; note on the deferred on-demand API
- `0019-grade-calibration-methodology.md` — lightweight approach (~12 tenders + disagreement notes, no % gate) and how future re-tunes work via `scoring_version`

## 5. TDD gate

Same as before. `lib/matching/` files get tests first. Signal tests use hand-crafted inputs; end-to-end tests use hand-labeled tenders.

## 6. Sequencing

1. **PR — schema (0016–0017):** opportunity_matches + workspace_capabilities (with `source` column)
2. **PR — scoring library** (signals + score + explain + capability-derive + tests using fixtures from real e-GP + WB data)
3. **PR — recompute triggers** (runner integration + server actions; no admin API)
4. **PR — /opportunities grade UI** (chips, popover, sort)
5. **PR — /workspaces/[id]/profile capabilities tab** (with auto-derive on import)
6. **PR — grade calibration doc + weight tune (if needed)**
7. **PR — Cross-cutting review pass + tag `v0.4.0-phase3`**

## 7. Open questions (need answers before approval)

1. **Capability taxonomy source** — SoT §16.7 lists 10 example keys. Do we ship those + let users add custom, or fix the list for MVP? Recommend: ship SoT's 10 as seed, disallow custom until Pro.
2. **Excluded_keywords normalization** — case-sensitive? word-boundary aware? Recommend case-insensitive, exact-word match (regex `\b`) to avoid "SME" excluding "SMEs".
3. **Score for new-workspace-no-profile** — before any recompute has run, do rows show `null` grade (hide chip) or synthetic "Not yet ranked"? Recommend the latter — explicit UX.
4. ~~**Recompute-on-profile-change scope**~~ **Decided: last 90 days.** Older is unlikely to be actionable (recorded in ADR 0018).
5. **Timing** — should grade recompute be blocking (user sees loader) or eventual (grade shows up seconds later)? Recommend eventual — Vercel serverless doesn't want long-blocking work; `revalidatePath` after chunks.
6. **Grade for the ranked feed vs shortlist** — do shortlisted opportunities always show their grade even if it drops to D after a re-score? Recommend yes; users want to see the change.
7. **Cold-start auto-derive precision** — how aggressive should keyword bucketing be? A single mention of "SAP" enough to auto-add ERP? Recommend: require ≥ 2 signal words per bucket, err on the side of fewer suggestions (better to under-suggest than mislabel).

## 8. Exit checklist

- [ ] Migrations 0016–0017 applied to local + hosted
- [ ] Scoring library ships with signal-level + score-level + explain + capability-derive tests
- [ ] Runner integration triggers per-opportunity recomputes
- [ ] Server actions trigger per-workspace recomputes
- [ ] `/opportunities` shows grade chips + "Why this grade?" popover + grade-sort
- [ ] Capabilities tab on workspace profile with auto-derived suggestions surfaced
- [ ] Not-eligible + Need-more-info states render distinctly from D
- [ ] Grade calibration doc committed: ~12 hand-labeled tenders + disagreement analysis + (optional) tuned constant
- [ ] `scoring_version` written on every match row for post-launch retune
- [ ] ADRs 0015–0019 committed
- [ ] Manual pilot test: BRAC IT workspace with imported eExperience projects + one monitoring profile → `/opportunities` shows grade-sorted list with auto-derived capabilities visible
- [ ] Tag `v0.4.0-phase3`

## 9. Rough size

**~3 weeks to v0.4.0** (down from 4–6 in v1), followed by a **1–2 week calibration tail** that ships as a follow-up patch, not a release gate.

- Week 1: schema + scoring library (5 signals + capability-derive) with initial weights from §2
- Week 2: recompute triggers + `/opportunities` grade UI
- Week 3: capabilities tab (with auto-derive) + hand-label 12 tenders with the BRAC IT bid team + ship v0.4.0
- Weeks 4–5 (post-launch): observe real usage via `scoring_version` telemetry; retune weights only if a systematic bias appears

## 10. What Phase 3 unlocks

- Peak 3 of the pilot demo (previously not-in-script): "Here are the tenders that are yours. Not everyone's — yours. With a reason next to each."
- Assessment (Phase 4) inherits the shortlisted set — only assess opportunities the user pursued
- Reports (Phase 6) can slice "how many A/B tenders did we act on this month?"

## 11. Blockers to watch for

- **BRAC IT name mismatch** (open thread) — same recon-first discipline: confirm which name they register under on e-GP before running the pilot demo.
- **Grade instability** — if a workspace's grade for a given tender jumps from A → C after a profile edit, they lose trust. Consider surfacing "grade changed: A → C because you removed sector X" alongside the new grade.
- **The Impeccable design pass** — deferred all through Phases 0–2. Phase 3 is where the UI gets scrutinized by users daily. Schedule the design pass to overlap with Phase 3 week 2–3.
- **Cold-start auto-derive false positives** — err toward fewer suggestions (see §7 Q7). A wrongly-suggested capability is worse than a missing one because it silently mis-scores every match.

### Explicitly deferred (with owner path)

Recorded here so nothing gets silently dropped:

- **Credential signal weight** → restore in Phase 4 when `credentials` table lands. ADR 0016 pins the recovery path.
- **On-demand recompute API** (`POST /matches/recompute`) → defer to Phase 6 or ops as-needed. In the interim, boundary changes are handled by a one-off ops script hitting the runner directly.
- **Source / method preference dimensions** → post-MVP only if a "preferred vs allowed" distinction is added to monitoring profiles.
- **Timeline suitability** → keep separate from grade unless the deadline chip/sort is removed from row UI (which would trigger re-folding).

## 12. Why this is the "make or break" phase for pilot

Phase 1 proves data flows. Phase 2 proves users can find it. **Phase 3 proves TenderSense is smarter than a spreadsheet.** If the grades don't align with BRAC IT's intuition, the pilot doesn't renew. If they do, the pilot converts.

Ship SoT weights, calibrate lightly with the bid team, watch real behavior with `scoring_version` in place, tune with data — not with a hand-labeled gate that guesses at production.
