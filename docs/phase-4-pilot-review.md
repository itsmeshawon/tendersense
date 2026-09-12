# Phase 4 pilot review — assessment engine walk-through

**Purpose:** Ground-truth the rule-based assessment engine against real BRAC IT tenders before tagging `v0.5.0-phase4`. Two outputs: (a) a punch list of pattern-library gaps for the next release, (b) confidence that the two-signal `grade + eligibility` verdict reads correctly to a bid lead.

**Scope:** 5–10 B-graded tenders from the live `opportunities` table. B is the sweet spot — A tenders are too obvious, C/D are too weak to test the eligibility signal on.

## Session prep (before the walk-through)

1. **Hosted `SCORING_VERSION=2` recompute** — run once:
   ```
   curl -X POST -H "x-admin-token: $ADMIN_TASK_TOKEN" \
     https://tendersense.app/api/admin/recompute-all
   ```
   Confirm `workspaces` and `matched` counts in the JSON response are non-zero.
2. **BRAC IT workspace profile check** — capabilities, sectors, credentials, financials, workforce all populated (otherwise category scores will read as `needs_verification` and mask real signal).
3. **Pull the shortlist** — 5–10 rows from `opportunity_matches` where `workspace_id = <BRAC IT>` and `grade = 'B'`, sorted by score desc. Prefer a spread across `bd_egp`, `bd_bppa`, and `world_bank` sources.
4. **Run an assessment on each** via the "Run Assessment" button. Free-plan quota is 5/month — bump the BRAC IT workspace to Pro for the session, or split into two months.

## For each tender: capture

| Field | Notes |
|---|---|
| Title | |
| Source | `bd_egp` / `bd_bppa` / `world_bank` |
| Grade | From `opportunity_matches.grade` |
| Score | 0–100 |
| Eligibility | `pass` / `partial` / `needs_verification` / `fail` |
| Recommendation | `bid` / `verify` / `hold` / `skip` |
| Requirements extracted | Count from Requirements tab |
| Requirements added manually | Count during the session |
| Bid-team verdict | *Would you actually bid on this? Yes / No / Maybe* |
| Agreement | Compare recommendation to bid-team verdict |
| Gap notes | Where did rules miss? Which pattern was needed? |

## After the session: outputs

- **`docs/phase-4-pattern-library-gaps.md`** — one bullet per missed pattern (e.g. "Registered vendor with X ministry — no rule; add `sector_registered_with_<agency>`"). Feeds the next release.
- **Weight adjustment PR (only if systematic bias)** — same rule as ADR 0019: retune only if a whole dimension is systematically over/under-weighted across the shortlist. Isolated disagreements do **not** justify a weight change.
- **Update this doc's "Session log" below** — timestamped notes so the bid team's answers are preserved for the next calibration cycle.

## Release gate

The `v0.5.0-phase4` tag ships when:

- [ ] Hosted recompute complete (all match rows carry `scoring_version = 2`)
- [ ] BRAC IT profile complete (credentials, financials, workforce, experts, projects, capabilities)
- [ ] ≥5 assessments run + logged here
- [ ] Bid-team agreement documented (no minimum percentage — the point is honest inspection, per ADR 0019)
- [ ] Pattern-library gaps captured in a follow-up doc
- [ ] No blocking regressions on `/opportunities` (grade + eligibility chips render on every row)

## Session log

<!-- Add one section per calibration session. Keep raw notes; the value is later diffing sessions to see if the engine improved. -->

### Session 1 — YYYY-MM-DD

Participants:

Tenders reviewed:

Verdict summary:

Pattern gaps observed:

Weight-tuning decision:
