# Phase 3 Finalization Checklist

**Estimated time:** ~15 minutes after this PR merges.

Steps to close Phase 3 — deliverables all shipped in sessions 22 + 23.

## Exit criteria (proposals/active/phase-3-matching/plan.md §8)

- [x] Migrations 0018–0019 applied to hosted (session 22, user-confirmed)
- [x] Scoring library ships with signal-level + score-level + explain + capability-derive tests
- [x] Runner integration triggers per-opportunity recomputes
- [x] Server actions trigger per-workspace recomputes
- [x] `/opportunities` shows grade chips + "Why this grade?" popover + grade-sort
- [x] Capabilities tab on workspace profile with auto-derived suggestions surfaced
- [x] Not-eligible + Need-more-info states render distinctly from D (ADR 0017)
- [x] `scoring_version` written on every match row
- [x] ADRs 0015–0019 committed (this PR)
- [ ] Grade calibration doc committed with template (this PR) — bid-team session is a follow-up sprint per ADR 0019, not a release gate
- [ ] Manual pilot test on prod: BRAC IT workspace + imported eExperience projects → `/opportunities?workspace=<id>` shows grade-sorted list with auto-derived capabilities
- [ ] Tag `v0.4.0-phase3`

## What's NOT gating the tag

Per ADR 0019, calibration is *not* a release gate. Tag ships now; calibration happens as a follow-up sprint after BRAC IT's bid team is available.

## Verify on prod

- [ ] Sign in as BRAC IT (or the demo persona)
- [ ] Visit `/workspaces/<id>/capabilities` — Capabilities tab renders. Multi-select "Add capabilities" works.
- [ ] Visit `/opportunities?workspace=<id>` — grade chips appear per row. Click a chip → popover shows reasons + concerns.
- [ ] Change sort to "Best fit" — grade order applied.
- [ ] Change any filter and hit Apply — workspace context preserved.

## Tag

```bash
git checkout main && git pull
git tag -a v0.4.0-phase3 -F- <<EOF
Phase 3 — Matching complete

- 5-dimension scoring model (capability, sector, keyword, past_project,
  country) sums to 100; ADR 0015 locks weights.
- opportunity_matches table with grade + reasons + concerns + scoring_version.
- Grade UI: A/B/C/D + Not eligible + Need more info per ADR 0006 §5.
  Full labels every time. Not-eligible visually distinct from D per ADR 0017.
- Cold-start auto-derive: eExperience import buckets projects into
  capabilities so fresh workspaces don't render "Need more info"
  everywhere on day one.
- Recompute triggers on ingest + profile mutation. Batched upserts:
  ~30s → ~2s at pilot volume.
- Grade calibration doc + methodology (ADR 0019) shipped; bid-team
  session is a follow-up.
- ADRs 0012-0019 committed.

Definition of MVP Done (SoT §114): items 1-12 checked.
EOF
git push origin v0.4.0-phase3
```

## Follow-ups queued for Phase 4 / 6

- Batch supabase writes in `lib/ingest/persistence.ts` (currently one round-trip per record; auto-derive already batches, ingest doesn't yet)
- Credential signal restoration when Phase 4's `credentials` table lands (ADR 0016)
- Sector coverage on `bd_egp` + `bd_bppa` adapters — currently null → sector signal inapplicable on ~80% of BD pool
- Grade calibration session with BRAC IT's bid team (ADR 0019)
- e-GP `procNature`/`procMethod` numeric codes recon (only `1`=Goods confirmed)
