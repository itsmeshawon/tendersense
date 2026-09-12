---
project: tendersense
started: 2026-09-11
status: active
stack: next + typescript + supabase + vercel + github
tier: mewking
collaborators:
  - "shawon (itsmeshawon on GitHub, mahedisalim@gmail.com) — founder"
  - "mohabbat (mewking2099 on GitHub, mohabbat2099@gmail.com) — engineer"
plan_approved: true
plan_approved_at: 2026-09-11
gate_block_count: 0
last_session: 2026-09-12
last_wrap: 2026-09-12
session_count: 21
current_phase: "Phase 2 — Discovery COMPLETE ✓ shipped at v0.3.0-phase2 on 2026-09-12. Phase 3 (Matching) approved, execution unblocked."
phase_1_plan_approved: true
phase_1_plan_approved_at: 2026-09-11
phase_2_plan_approved: true
phase_2_plan_approved_at: 2026-09-12
phase_3_plan_approved: true
phase_3_plan_approved_at: 2026-09-12
production_url: "https://tendersense-delta.vercel.app"
email_provider: "Resend (noreply@tendersense.app)"
master_spec: "raw/TenderSense_MVP_Source_of_Truth.md"
active_plans:
  - "proposals/active/phase-0-foundation/plan.md (COMPLETE — shipped at v0.1.0-phase0 on 2026-09-11)"
  - "proposals/active/phase-1-source-ingestion/plan.md (COMPLETE — shipped at v0.2.0-phase1 on 2026-09-12)"
  - "proposals/active/phase-2-discovery/plan.md (COMPLETE — shipped at v0.3.0-phase2 on 2026-09-12)"
  - "proposals/active/phase-3-matching/plan.md (APPROVED v2 2026-09-12 — 5-dim scoring; execution unblocked)"
pilot: "BRAC IT Services"
github: "https://github.com/itsmeshawon/tendersense (private)"
hosted_supabase: "tendersense (project ref tatkdyjukxzibvaqpoau, ap-south-1)"
next_action: "Session 22 — kick off Phase 3 (Matching). First PR: schema migrations 0018 (opportunity_matches) + 0019 (workspace_capabilities) per proposals/active/phase-3-matching/plan.md §6.1. Then scoring library (5 signals + capability-derive) with unit tests using real e-GP + WB fixtures. Deliverable target: BRAC IT logs in, /opportunities feed is graded (A/B/C/D + Not eligible + Need more info) with 'Why this grade?' popover surfacing top reasons."
open_questions:
  - "PII stance for named procuring-entity officials (encoded in ADR 0006 §8 + lib/ingest/pii.ts; awaiting formal sign-off)"
  - "**BRAC IT name on e-GP eExperience** — pilot demo Peak 1 assumes typing 'BRAC IT' returns their contracts. Live recon 2026-09-12 showed BRAC IT returns zero results; Beximco returned one. Confirm with BRAC IT which legal name they register under on e-GP before scheduling the pilot demo. See docs/eexperience-reconnaissance-checklist.md § 'Unexpected finding'"
  - "Data-residency counsel question — drafted at docs/data-residency-counsel-question.md; awaiting user review + filing"
  - "Grade vocabulary — verify 'Strong fit / Good fit / Possible / Weak fit' reads well with BRAC IT or a BD product manager reviewer before Phase 3 UI ships"
  - "T&C automated-access clause at eprocure.gov.bd footer — read before production launch of eExperience lookup"
env_var_rule: "Never write NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_DB_URL from any other project or shell env. User creates the Supabase project and hands over values explicitly. Ask before wiring."
open_threads: []
blockers: []
figma_file_key: null
---

# tender-sense

Tender discovery + qualification platform (not submission). Pilot organization: BRAC IT Services.

## Source of truth

The canonical specification lives at `raw/TenderSense_MVP_Source_of_Truth.md` (v0.2, 2026-09-11).
Do not restate it in plans — reference sections by number (e.g. §14, §16, §19).
See `proposals/MASTER_SPEC.md` for the pointer + phase index.

## Planning shape

Seven MVP build phases (SoT §113), each planned and approved separately:

- Phase 0 — Foundation (auth, workspaces, RLS, deploy)
- Phase 1 — Source ingestion (WB + BPPA adapters, cron)
- Phase 2 — Discovery (list, search, filters, detail, monitoring)
- Phase 3 — Matching (deterministic scoring + reasons)
- Phase 4 — Assessment (quota + requirement extraction + eligibility)
- Phase 5 — Collaboration (team, shortlist, decisions, tasks)
- Phase 6 — Alerts / reporting (revisions, digest, reports, export)

Definition of MVP Done: SoT §114 (18-item checklist).
