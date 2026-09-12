# Plan: Phase 3 — Matching

**Tier:** MewKing
**Status:** Draft — awaiting approval after Phase 2 tags `v0.3.0-phase2`
**Master spec:** `raw/TenderSense_MVP_Source_of_Truth.md` + `raw/TenderSense-SOT-Changes (1).md`
**SoT sections:** §7.5 Match, §16.18 opportunity_matches, §19 Matching Engine, §24 Recommendation
**Governing ADR:** `decisions/0006-sot-2026-09-09-scope.md` §5 (grade + decision, no percentages) and §6 (hardcoded thresholds)
**Exit criteria (SoT §113):** *"user understands why opportunities are shown"*

---

## 1. Scope

**This is the phase where TenderSense becomes tender-sensing.** BRAC IT logs in, and every opportunity has a grade against their profile. The two peaks of the pilot demo already work (eExperience unlock + Discovery feed) — Phase 3 makes the product's promise real.

**In scope:**

- **`opportunity_matches` table** (SoT §16.18) — per-workspace precomputed match rows with grade + reasons
- **Deterministic scoring engine** — no LLM (SoT §19.1). Weighted-sum model across 9 categories with normalization when data is missing
- **Grade vocabulary + escape hatches** (ADR 0006 §5):
  - **A — Strong fit** (85–100)
  - **B — Good fit** (70–84)
  - **C — Possible** (50–69)
  - **D — Weak fit** (0–49)
  - **Not eligible** — a make-or-break requirement fails (separate row state)
  - **Need more info** — profile is missing something material
- **Explainability panel** per row — the top positive + negative reasons (SoT §19.4)
- **Grade-boundary constants** in one file (ADR 0006 §6)
- **Recompute triggers**: on new opportunity, on workspace-profile update, on-demand via `POST /matches/recompute`
- **`/opportunities` upgrade**: sort-by-grade default for logged-in workspaces, grade chip per row, "Why this?" popover
- **Profile capabilities UI** — `workspace_capabilities` table (SoT §16.8) already ready; add CRUD

**Not in scope for Phase 3 (moved to Phase 4):**

- Assessment-per-opportunity (deeper qualification, LLM-based, consumes quota)
- Requirement extraction from the notice text
- Evidence linking + gaps
- Quota enforcement

## 2. The scoring model (SoT §19.2, refined per ADR 0006 §2)

**Total = 100 points across nine dimensions.** If a dimension is data-missing, redistribute proportionally.

| Dimension | Weight | Signal source |
|---|---|---|
| Service / capability match | 30 | Workspace capabilities ∩ opportunity keywords |
| Sector match | 15 | Workspace sectors ∩ opportunity sector[] |
| Country / market match | 10 | Workspace country ∈ opportunity country |
| Source preference | 5 | Monitoring profile sources include the opportunity source |
| Opportunity type preference | 5 | Monitoring profile methods include the procurement method |
| Keyword similarity | 15 | Title/description tokens ∩ workspace keywords |
| Past project similarity | 10 | Uses `public.projects` — imported eExperience contracts + manual entries |
| Credential signal | 5 | Uses `public.credentials` (see Phase 4) — placeholder for Phase 3 |
| Timeline suitability | 5 | `days_remaining` inside the monitoring profile's `min_days_remaining` |

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
- If workspace declared a mandatory credential (Phase 4) that the opportunity requires and the workspace doesn't have → **Not eligible** (still shown on shortlists, but never in the ranked feed)

### Need-more-info short-circuit

- If workspace has zero capabilities + zero projects + zero declared sectors → **Need more info**, all opportunities render with a "Complete your profile" CTA instead of a grade.

### Ambiguity

Do not silently treat "unknown" as zero. Redistribute weights across only the dimensions where signals exist. This matches ADR 0006 §4 (Phase 4 rule) — don't manufacture false certainty.

## 3. Deliverables

### 3.1 Schema (migrations 0016–0017)

- `0016_opportunity_matches.sql` — SoT §16.18. Unique on (workspace_id, opportunity_id). Includes: `score smallint`, `grade text check ('A','B','C','D','not_eligible','need_more_info')`, `reasons jsonb`, `concerns jsonb`, `scoring_version int`, `computed_at timestamptz`. RLS: workspace members read their own.
- `0017_workspace_capabilities.sql` — SoT §16.8 (already in the SoT but not migrated in Phase 0). RLS: is_workspace_member.

### 3.2 Scoring library

Under `apps/web/lib/matching/`:

- `types.ts` — `MatchGrade`, `MatchReason`, `MatchInput` shapes
- `signals.ts` — pure functions per dimension. Each returns `{ weight, matched, evidence }`
- `score.ts` — combines signal outputs → total → grade
- `explain.ts` — turns signal outputs into a top-N reasons list for UI
- `recompute.ts` — orchestrates: for a workspace + set of opportunities, compute + upsert `opportunity_matches`

Fully unit-testable — no I/O. Sample-input tests against a hand-labeled set of ~10 realistic BRAC IT scenarios.

### 3.3 Recompute triggers

Three ways matches get recomputed:

- **New opportunity lands** — runner (Phase 1) calls `recomputeForOpportunity(opportunityId)` after upsert, which computes matches for every workspace that has a monitoring profile matching this source/country/nature. Async, best-effort.
- **Workspace profile changes** — server action from `/monitoring`, `/workspaces/[id]/profile`, or eExperience import triggers `recomputeForWorkspace(workspaceId)` — scans last N days of opportunities.
- **On-demand** — `POST /api/v1/workspaces/[id]/matches/recompute` (SoT §32) for admin re-scoring after grade-boundary changes.

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
  - Add / remove
  - Impact preview: "10 more opportunities become A/B if you add ERP"

### 3.5 Grade calibration

- Draft a `docs/grade-calibration.md` with ~40 hand-labeled tenders from BRAC IT's history (Peak 1 imports work for this — real e-GP data)
- Compare each label ("we would/wouldn't bid") to computed grade
- Iterate on `GRADE_BOUNDARIES` until agreement rate > 80%
- Ship the tuned constant, note the calibration date in a comment

Per ADR 0006 §6: hardcoded, not user-configurable, but revisited on data.

## 4. Decisions to record as ADRs

- `0015-scoring-signals.md` — the 9 dimensions and their weights (locks §2 above)
- `0016-not-eligible-vs-weak-fit.md` — why they're distinct rows (per SoT-Changes #2 warning: "D and 'not eligible' must not look the same")
- `0017-recompute-triggers.md` — three trigger paths; batching strategy
- `0018-grade-calibration-methodology.md` — how the boundaries were tuned and how future re-tunes work

## 5. TDD gate

Same as before. `lib/matching/` files get tests first. Signal tests use hand-crafted inputs; end-to-end tests use hand-labeled tenders.

## 6. Sequencing

1. **PR — schema (0016–0017):** opportunity_matches + workspace_capabilities
2. **PR — scoring library** (signals + score + explain + tests using fixtures from real e-GP + WB data)
3. **PR — recompute triggers** (runner integration + server actions + API route)
4. **PR — /opportunities grade UI** (chips, popover, sort)
5. **PR — /workspaces/[id]/profile capabilities tab**
6. **PR — grade calibration** (docs + tuned constant + ADR)
7. **PR — Cross-cutting review pass + tag `v0.4.0-phase3`**

## 7. Open questions (need answers before approval)

1. **Capability taxonomy source** — SoT §16.7 lists 10 example keys. Do we ship those + let users add custom, or fix the list for MVP? Recommend: ship SoT's 10 as seed, disallow custom until Pro.
2. **Excluded_keywords normalization** — case-sensitive? word-boundary aware? Recommend case-insensitive, exact-word match (regex `\b`) to avoid "SME" excluding "SMEs".
3. **Score for new-workspace-no-profile** — before any recompute has run, do rows show `null` grade (hide chip) or synthetic "Not yet ranked"? Recommend the latter — explicit UX.
4. **Recompute-on-profile-change scope** — recompute against every opportunity ever, or only last 90 days? Recommend last 90; older is unlikely to be actionable.
5. **Timing** — should grade recompute be blocking (user sees loader) or eventual (grade shows up seconds later)? Recommend eventual — Vercel serverless doesn't want long-blocking work; `revalidatePath` after chunks.
6. **Grade for the ranked feed vs shortlist** — do shortlisted opportunities always show their grade even if it drops to D after a re-score? Recommend yes; users want to see the change.

## 8. Exit checklist

- [ ] Migrations 0016–0017 applied to local + hosted
- [ ] Scoring library ships with signal-level + score-level + explain tests
- [ ] Runner integration triggers per-opportunity recomputes
- [ ] Server actions trigger per-workspace recomputes
- [ ] `/opportunities` shows grade chips + "Why this grade?" popover + grade-sort
- [ ] Capabilities tab on workspace profile
- [ ] Not-eligible + Need-more-info states render distinctly from D
- [ ] Grade calibration doc committed with the tuned constant
- [ ] ADRs 0015–0018 committed
- [ ] Manual pilot test: BRAC IT workspace with imported eExperience projects + one monitoring profile → `/opportunities` shows grade-sorted list
- [ ] Tag `v0.4.0-phase3`

## 9. Rough size

**4–6 weeks solo pace, faster with the teammate.** Not because the code is huge — the scoring library is ~500 lines of pure functions — but because **calibration eats time**. We won't know if the grades match BRAC IT's intuition until we ship and iterate.

Suggested calibration approach:
- Week 1: schema + scoring library with initial weights from SoT §19.2
- Week 2: recompute triggers + `/opportunities` UI
- Week 3: capabilities tab + hand-label 40 tenders with the BRAC IT bid team
- Week 4: tune boundaries, ship, watch first-week feedback
- Weeks 5–6: iterate on signal weights based on observed misgrades

## 10. What Phase 3 unlocks

- Peak 3 of the pilot demo (previously not-in-script): "Here are the tenders that are yours. Not everyone's — yours. With a reason next to each."
- Assessment (Phase 4) inherits the shortlisted set — only assess opportunities the user pursued
- Reports (Phase 6) can slice "how many A/B tenders did we act on this month?"

## 11. Blockers to watch for

- **Cold-start problem**: a new workspace with no capabilities, no projects, no history renders "Need more info" everywhere. Peak 1 (eExperience) mitigates by auto-filling `projects`. But **capabilities are still manual**. Consider: infer capabilities from the imported projects' sector fields + contract-value bands. Zero-friction default.
- **BRAC IT name mismatch** (open thread) — same recon-first discipline: confirm which name they register under on e-GP before running the pilot demo.
- **Grade instability** — if a workspace's grade for a given tender jumps from A → C after a profile edit, they lose trust. Consider surfacing "grade changed: A → C because you removed sector X" alongside the new grade.
- **The Impeccable design pass** — deferred all through Phases 0–2. Phase 3 is where the UI gets scrutinized by users daily. Schedule the design pass to overlap with Phase 3 week 3–4.

## 12. Why this is the "make or break" phase for pilot

Phase 1 proves data flows. Phase 2 proves users can find it. **Phase 3 proves TenderSense is smarter than a spreadsheet.** If the grades don't align with BRAC IT's intuition, the pilot doesn't renew. If they do, the pilot converts.

Calibrate carefully. Ship weekly. Watch the bid team's face when the grade lands.
