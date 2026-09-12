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
last_session: 2026-09-13
last_wrap: 2026-09-13
session_count: 25
current_phase: "Phase 4 shipped at v0.5.0-phase4 on 2026-09-13. Assessment engine end-to-end in prod (rules extractor · evaluator · scorer · runner · quota · two-signal UI · credential signal · SCORING_VERSION=2 sweep applied to all 2,536 match rows). BRAC IT profile populated. Pilot bid-team calibration walk-through is a follow-up sprint per ADR 0019."
phase_1_plan_approved: true
phase_1_plan_approved_at: 2026-09-11
phase_2_plan_approved: true
phase_2_plan_approved_at: 2026-09-12
phase_3_plan_approved: true
phase_3_plan_approved_at: 2026-09-12
phase_4_plan_approved: true
phase_4_plan_approved_at: 2026-09-13
production_url: "https://tendersense.app"
production_url_legacy: "https://tendersense-delta.vercel.app"
email_provider: "Resend (noreply@tendersense.app)"
master_spec: "raw/TenderSense_MVP_Source_of_Truth.md"
active_plans:
  - "proposals/active/phase-0-foundation/plan.md (COMPLETE — shipped at v0.1.0-phase0 on 2026-09-11)"
  - "proposals/active/phase-1-source-ingestion/plan.md (COMPLETE — shipped at v0.2.0-phase1 on 2026-09-12)"
  - "proposals/active/phase-2-discovery/plan.md (COMPLETE — shipped at v0.3.0-phase2 on 2026-09-12)"
  - "proposals/active/phase-3-matching/plan.md (COMPLETE — shipped at v0.4.0-phase3 on 2026-09-12)"
  - "proposals/active/phase-4-assessment/plan.md (COMPLETE — shipped at v0.5.0-phase4 on 2026-09-13)"
pilot: "BRAC IT Services"
github: "https://github.com/itsmeshawon/tendersense (private)"
hosted_supabase: "tendersense (project ref tatkdyjukxzibvaqpoau, ap-south-1)"
next_action: "Phase 5 direction. Two candidate tracks: (a) BRAC IT bid-team calibration walk-through — run 5–10 assessments together, log pattern-library gaps into docs/phase-4-pattern-library-gaps.md, feed the next release; (b) Phase 5 scoping — profile-plan §S completion (evidence document upload + PDF extraction, deferred from Phase 4.5), notifications/digests, or team collaboration UI. Pilot demo readiness (Peak 1 e-GP lookup with BRAC IT's actual registered legal name) is a prerequisite for (a)."
open_questions:
  - "PII stance for named procuring-entity officials (encoded in ADR 0006 §8 + lib/ingest/pii.ts; awaiting formal sign-off)"
  - "**BRAC IT name on e-GP eExperience** — pilot demo Peak 1 assumes typing 'BRAC IT' returns their contracts. Live recon 2026-09-12 showed BRAC IT returns zero results; Beximco returned one. Confirm with BRAC IT which legal name they register under on e-GP before scheduling the pilot demo. See docs/eexperience-reconnaissance-checklist.md § 'Unexpected finding'"
  - "Data-residency counsel question — drafted at docs/data-residency-counsel-question.md; awaiting user review + filing"
  - "Grade vocabulary — verify 'Strong fit / Good fit / Possible / Weak fit' reads well with BRAC IT or a BD product manager reviewer before Phase 3 UI ships"
  - "T&C automated-access clause at eprocure.gov.bd footer — read before production launch of eExperience lookup"
  - "Monitoring profile 'sources' field is single-select in the UI; users expect multi-select (checkbox group or multi-select dropdown). Non-blocking for pilot; revisit post-v0.5.0-phase4."
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
