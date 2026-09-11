---
project: tender-sense
started: 2026-09-11
status: active
stack: next + typescript + supabase + vercel + github
tier: mewking
plan_approved: true
plan_approved_at: 2026-09-11
gate_block_count: 0
last_session: 2026-09-12
last_wrap: 2026-09-12
session_count: 9
current_phase: "Phase 1 — Source ingestion (docs debt cleared; adapter code still waiting on PR #8 review)"
phase_1_plan_approved: true
phase_1_plan_approved_at: 2026-09-11
production_url: "https://tendersense-delta.vercel.app"
email_provider: "Resend (noreply@tendersense.app)"
master_spec: "raw/TenderSense_MVP_Source_of_Truth.md"
active_plans:
  - "proposals/active/phase-0-foundation/plan.md (COMPLETE — shipped at v0.1.0-phase0 on 2026-09-11)"
  - "proposals/active/phase-1-source-ingestion/plan.md (APPROVED 2026-09-11, execution starting session 6)"
pilot: "BRAC IT Services"
github: "https://github.com/itsmeshawon/tendersense (private)"
hosted_supabase: "tendersense (project ref tatkdyjukxzibvaqpoau, ap-south-1)"
next_action: "Session 10: git pull; verify PR #8 merged (needs @mewking2099 review). If merged, start Phase 1 step 4 — World Bank adapter + backfill + npm run sync:worldbank. Open a GitHub Issue first. If not merged, nudge Mohabbat (docs debt is now cleared — data-residency draft and pilot demo script both shipped; only PR review + manual work items remain)."
open_questions:
  - "PII stance for named procuring-entity officials (proposed in ADR 0006 §8 — needs sign-off before e-GP adapter is written)"
  - "eExperience URL + HTML selectors — manual reconnaissance task, not code"
  - "Data-residency counsel question — draft the specific question (customer-uploaded docs + officials PII), file with lawyer; not launch-blocker for pilot but must not drift"
  - "Grade vocabulary — verify 'Strong fit / Good fit / Possible / Weak fit' reads well with BRAC IT or a BD product manager reviewer before Phase 3 UI ships"
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
