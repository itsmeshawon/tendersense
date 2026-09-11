# tender-sense — session log

## Session 1 — 2026-09-11

**Tier:** MewKing · **Plan:** `proposals/active/phase-0-foundation/plan.md` (approved 2026-09-11)
**Phase:** Phase 0 — Foundation

### What shipped

- Project scaffold via `mew new code-project` + git init on `main`
- Read Source of Truth (`raw/TenderSense_MVP_Source_of_Truth.md`, 5148 lines / 128 sections)
- `proposals/MASTER_SPEC.md` pointer + phase index; plan drafted, decisions folded in (all 7 open questions answered), plan_approved: true
- Next.js 16.3.4 + TypeScript + Tailwind v4 + shadcn/ui under `apps/web/`
- Supabase CLI local stack via OrbStack; ports shifted to 5433x so Truzo (5432x) can coexist
- Migrations 0001–0005 applied to local **and** pushed to hosted `tendersense` (SoT §16.1–16.3, §17)
- Signup allowlist gate (invite-only signup, per plan decision §7)
- Vitest wired; 11 tests / 4 files passing (env accessors + three Supabase clients)
- `lib/supabase/`: env accessors, browser client, server client (RLS cookies), service-role client (server-only guard)
- CI workflow scoped to `apps/web/`; initial push to https://github.com/itsmeshawon/tendersense (private)
- Rotated Supabase API keys after chat exposure; swapped DB URL to session pooler (free tier direct host is DNS-blocked)
- Two memories saved: env-var gate for tender-sense, and free-tier pooler-only DB URL

### Not done (blocking Phase 0 exit)

- Auth pages (login + magic-link callback)
- `middleware.ts` + `getServerUser()`
- Workspace create UI
- Vercel deploy
- RLS integration test
- ADRs 0001–0004

### Position vs Source of Truth

- Phase 0 (foundation): **~60%**
- MVP overall (§113 phases 0–6): **~6–8%**
- Definition of MVP Done (§114, 18 items): 0/18 fully checkable yet

## Session 2 — 2026-09-11

**Tier:** MewKing · **Plan:** `proposals/active/phase-0-foundation/plan.md`
**Phase:** Phase 0 — Foundation (step 4: auth wiring)

### What shipped

- `lib/auth/session.ts` — `getServerUser()` helper + 3 tests
- `middleware.ts` — Supabase session cookie refresh; redirect unauthenticated users off `/dashboard`, `/workspaces`; redirect authenticated users off `/login` → `/dashboard`
- `app/login/page.tsx` + `actions.ts` — magic-link form via `useActionState` + `signInWithOtp`
- `app/auth/callback/route.ts` — PKCE `exchangeCodeForSession` with error fall-through to `/login?error=...`
- `app/dashboard/page.tsx` + `signOut` action — protected landing showing user email
- Verified end-to-end against hosted Supabase: golden path (allowlisted email → magic link → dashboard) and reject path (unlisted email → no email sent, no auth.users row)
- 16 tests / 6 files passing; typecheck + build clean

### Decisions (informal, to be codified at Finalize)

- Adopting **feature branch + PR + squash-merge** workflow now that teammates are joining. First PR: `feat/phase0-auth`.
- Impeccable design flow deferred to a dedicated pass after Phase 0 exit; Phase 0 UI is intentionally minimal.

### Not done (blocking Phase 0 exit)

- Workspace create UI (step 6)
- Vercel deploy (step 7)
- RLS integration test (step 8)
- ADRs 0001–0004 (step 10)

### Position vs Source of Truth

- Phase 0 (foundation): **~75%** (auth wiring complete; workspaces UI + deploy + RLS test remaining)
- MVP overall (§113 phases 0–6): **~8–10%**
- Definition of MVP Done (§114, 18 items): 0/18 fully checkable yet

## Session 4 — 2026-09-11

**Tier:** MewKing · **Plan:** Phase 0 finalize + Phase 1 draft
**Phase:** Phase 0 → complete; Phase 1 planning

### What shipped

- **PR #4 — ADRs 0001–0005** (`docs/phase0-adrs`): repo layout, package manager, supabase clients, workspace creation RPC, git workflow. Merged 2026-09-11.
- **Tag `v0.1.0-phase0`** on `main` @ `75dbc69`. Phase 0 officially closed.
- **`proposals/active/phase-1-source-ingestion/plan.md` drafted** — 8 sections, 7 open questions, ~2–3 week phase estimate. Not approved yet.
- **`proposals/MASTER_SPEC.md` phase index updated**: Phase 0 DONE, Phase 1 drafting.

### Position vs Source of Truth

- Phase 0 (foundation): **100% ✅**
- MVP overall (§113 phases 0–6): **~14–17%** (1 of 7 phases done)
- Definition of MVP Done (§114, 18 items): partial-complete on infra items; user-facing items 0/many

## Session 3 — 2026-09-11

**Tier:** MewKing · **Plan:** `proposals/active/phase-0-foundation/plan.md`
**Phase:** Phase 0 — Foundation (steps 6 + 7 + 8)

### What shipped

- **PR #2 — Workspaces UI (step 6):** `lib/workspaces/{repository,service}.ts` (RLS-scoped list + create_workspace RPC), `/workspaces` list + zero-state redirect, `/workspaces/new` form with individual/organization radio + server action. `/dashboard` becomes post-login router. 12 new tests.
- **PR #3 — RLS integration test (step 8):** two-user integration test (`tests/integration/rls.test.ts`) against real local Supabase — Alice creates workspace via RPC, Bob cannot see it or Alice's membership, direct INSERT blocked, allowlist unreadable (42501), auth-trigger blocks unknown emails. Vitest split into unit (CI-safe) + integration (needs Docker) configs. 10 integration tests passing.
- **Migration 0006:** explicit table grants for `authenticated` + `service_role`. Uncovered real gap — local Supabase doesn't inherit default privileges that hosted has; RLS policies were unreachable behind bare "permission denied". Pushed to hosted (idempotent).
- **Vercel deploy (step 7):** repo imported, root dir set to `apps/web`, env vars pasted, deployed at https://tendersense-delta.vercel.app.
- **Domain + email:** `tendersense.app` purchased on Hostinger, DKIM + CNAMEs added, Resend verified. Supabase SMTP switched to Resend (`noreply@tendersense.app`).
- **Production auth end-to-end verified with two real users** (mahedisalim@gmail.com + mohabbat2099@gmail.com invited to repo + allowlist). Teammate logged in, created a workspace, saw it. RLS holds in production.
- Adopted feature-branch + PR + squash-merge workflow. Three PRs merged this session (#1 already from session 2). CI caught one lint error on PR #1 before merge.

### Decisions (informal, to be codified as ADRs in session 4)

- Repo layout: `apps/web/` (room for future `apps/workers/`)
- Package manager: npm
- Supabase clients: three-file pattern (`client.ts`, `server.ts`, `service.ts` with server-only guard)
- Workspace creation: SECURITY DEFINER RPC (no INSERT policies on workspaces/members)
- Git workflow: feature branch + PR + squash-merge for non-trivial changes
- Local Supabase runs on shifted ports (5433x) so Truzo can coexist

### Not done (blocking Phase 0 exit)

- ADRs 0001–0005 (step 10)
- Tag `v0.1.0-phase0`

### Position vs Source of Truth

- Phase 0 (foundation): **~95%** (only ADRs + tag remaining)
- MVP overall (§113 phases 0–6): **~12–14%**
- Definition of MVP Done (§114, 18 items): 0/18 fully checkable yet (Phase 0 items partial)

## Session 5 — 2026-09-11

**Tier:** MewKing · **Plan:** SoT revision incorporation + Phase 1 replan
**Phase:** Phase 1 planning

### What shipped

- **PR #5 — `docs/sot-2026-09-09-incorporation`** merged (`main` @ `a3f131e`)
- **ADR 0006** captures the entire 2026-09-09 SoT delta in one place — no need to juggle two source docs
- **Phase 1 plan rewritten** with the sharpened scope: WB + e-GP notices + on-demand eExperience lookup (three adapters, not four; ~2 weeks not 3-4)
- **Individual workspace type hidden** on `/workspaces/new` (schema retained)
- **MASTER_SPEC** now points at both `raw/` docs; phase index labels reflect scope cuts
- **Project_Status open_questions** now carry 4 threads: PII rule, eExperience reconnaissance, data-residency counsel question, grade vocabulary sanity check
- Vercel preview built cleanly on PR #5

### Deferred to future phase plans (recorded in ADR 0006)

- Phase 3: grade + decision only (A/B/C/D with plain words), plus Not-eligible + Need-more-info escape hatches; hardcoded thresholds calibrated on labelled data
- Phase 4: eligibility checklist with hard-fail, no percentage
- Phase 5: single-user Pro only for MVP; teams post-MVP
- Phase 6: revisions + digest to a single user; no team reports/exports

### Position vs Source of Truth

- Phase 0: **100% ✅**
- Phase 1 planning: **complete**; awaiting execution
- MVP overall (SoT §113, scope-reduced per ADR 0006): unchanged in percent terms, but the ceiling is lower now — Phase 5 + 6 have less to build

## Session 6 — 2026-09-11

**Tier:** MewKing · **Plan:** `proposals/active/phase-1-source-ingestion/plan.md` (approved 2026-09-11)
**Phase:** Phase 1 — Source ingestion (step 2: schema)

### What shipped

- **PR #6 — `feat/phase1-schema`** merged (`main` @ `f5de461`) — five migrations 0007–0011:
  - `0007_sources` — registry with `world_bank` + `bd_egp` seed rows; cursor lives in `configuration jsonb`
  - `0008_source_records` — raw payload retained per ADR 0006 §3; server-only (no client role has access)
  - `0009_opportunities` — canonical normalized notice; auth-readable via RLS (SoT §17 public-data exception); tsvector `search_text` refreshed on write; **zero PII columns** per ADR 0006 §8
  - `0010_opportunity_revisions + source_sync_runs` — amendment detection (SoT §26) + ingestion bookkeeping (SoT §13)
  - `0011_projects` — workspace-scoped past-contracts table (SoT §16.9) + `evidence_credential_number` for e-GP eExperience integration; `is_workspace_member` RLS gate
- Applied to local (10 tables total, 2 sources seeded) + pushed to hosted `tendersense`
- Grants verified via `information_schema.role_table_grants`: opportunities/revisions read-only for authenticated, projects full CRUD for authenticated (via RLS), sources/source_records/sync_runs server-only
- 28/28 unit + 10/10 RLS integration tests still green (new tables don't break existing isolation)
- Vercel preview built cleanly on PR #6

### Not done (blocking Phase 1 exit)

- PR #3 in plan sequence — adapter contract + normalizer + `pii.ts` + `http.ts`
- WB adapter + backfill
- Runner + revision detection
- e-GP notices adapter
- Cron workflows
- eExperience lookup + profile-onboarding UI
- Bonus `/opportunities` list (optional)
- Remaining ADRs 0007–0010 + tag `v0.2.0-phase1`

### Position vs Source of Truth

- Phase 1: **~15% of the phase** (schema done; 6 more code PRs to go)
- MVP overall (§113 scope-reduced): **~17–19%**

## Session 8 — 2026-09-12

**Tier:** MewKing · **Plan:** `proposals/active/phase-1-source-ingestion/plan.md`
**Phase:** Phase 1 — Source ingestion (docs pass while PR #8 awaits review)
**Setting:** PR #8 (adapter plumbing) still unreviewed by @mewking2099. Instead of stacking risk on top of an in-review branch, this session cleared docs debt from the tail of Phase 1.

### What shipped

- **ADRs 0007–0010** landed direct-to-main under the code-rules docs exception:
  - `0007-ingest-runner-pattern.md` — one runner orchestrates; adapters are data
  - `0008-content-hash-scope.md` — SoT §26 material fields; explicit exclusion of reference_no/tags/sector
  - `0009-cron-infrastructure.md` — GitHub Actions; not pg_cron / Scheduled Edge Functions / Vercel Cron
  - `0010-eexperience-on-demand.md` — eExperience is a lookup, not a cron adapter
- **Phase 1 plan §3** updated from "to record" to "recorded"
- **`docs/pilot-demo-script.md` drafted** — 20-min pilot demo for BRAC IT, structured around two peaks (eExperience unlock + Discover feed with amendment detection), fallback plans, pre-demo checklist, what NOT to demo

### Not shipped (still waiting)

- PR #8 review by @mewking2099 (adapter plumbing) — blocks step 4 (WB adapter)
- Everything downstream of PR #8

### Position vs Source of Truth

- Phase 1: **~35–40%** (all planned ADRs done ahead of schedule; adapter code still to come)
- MVP overall (§113 scope-reduced): **~21–23%**
- Definition of MVP Done (§114, 18 items): infra items partial; user-facing items 0/many

### Open threads

- eExperience URL + selector reconnaissance (Phase 1 §6 Q8) — now flagged as **blocker for scheduling any pilot demo** in `docs/pilot-demo-script.md` §12. Not just a code prereq.
- `/opportunities` list (Phase 1 §6 Q5) — optional in the plan; demo script §12 recommends shipping it or Peak 2 of the demo becomes much weaker
- PII rule (ADR 0006 §8) — encoded in code + tests; awaiting formal sign-off
- Data-residency counsel question — draft not written yet
- Grade vocabulary reader check — Phase 3, nice-to-have before demo

## Session 9 — 2026-09-12

**Tier:** MewKing · **Plan:** `proposals/active/phase-1-source-ingestion/plan.md`
**Phase:** Phase 1 — Source ingestion (docs pass while PR #8 still awaits review)

### What shipped

- **`docs/data-residency-counsel-question.md`** — structured counsel query per ADR 0006 §9. Three categories (MVP pilot / Post-pilot Pro / Deliberate exclusions), numbered sub-questions, regime references with 2025/2026 update caveat, 4-week/2-week turnaround target. Draft ready for user review + naming decision before sending.

### Not shipped

- PR #8 (adapter plumbing) — still open, still no review from @mewking2099. Every downstream Phase 1 step remains blocked.

### Position vs Source of Truth

- Phase 1: **~40%** (all ADRs done, counsel question drafted, code still stalled on PR #8)
- MVP overall (§113 scope-reduced): **~22–24%**

### Open threads

- **PR #8 review** — biggest blocker; nudge Mohabbat if session 10 opens with it still stuck
- eExperience URL + selector reconnaissance — manual, blocks pilot demo scheduling
- `/opportunities` list — decide before Phase 1 exit
- PII rule (ADR 0006 §8) — encoded, awaiting formal sign-off
- Data-residency counsel question — drafted; awaiting user review + filing
- Grade vocabulary reader check — Phase 3, not urgent

## Session 10 — 2026-09-12

**Tier:** MewKing · **Plan:** `proposals/active/phase-1-source-ingestion/plan.md`
**Phase:** Phase 1 — Source ingestion (docs pass 2; PR #8 still awaits review)

### What shipped

- **`docs/eexperience-reconnaissance-checklist.md`** — 21 numbered fill-in questions for someone to answer with a browser at eprocure.gov.bd. Covers entry-point URL, request shape, response HTML structure, pagination, edge cases, detail page, Bangla/English, robots.txt, terms of use, confidence check. Concrete 20-30 min task that unblocks Phase 1 PR #8 (eExperience lookup) and Peak 1 of the pilot demo.
- **`README.md`** — first repo README. Directory layout, contributor onboarding, local Supabase setup, workflow rules, deploy targets, reading order for new joiners.

### Not shipped

- PR #8 review — still stuck. All downstream Phase 1 code blocked.

### Position vs Source of Truth

- Phase 1: **~42%** — every solo doc task from the plan tail is now done
- MVP overall (§113 scope-reduced): **~23–25%**

### Note

Solo docs work is genuinely exhausted for Phase 1. Every remaining item needs either a code merge (PR #8) or human action (reconnaissance, counsel filing, reader check). Session 11 needs one of those to unstick before more can happen.

## Session 11 — 2026-09-12

**Tier:** MewKing · **Plan:** `proposals/active/phase-1-source-ingestion/plan.md`
**Phase:** Phase 1 — Source ingestion (WebFetch reconnaissance)

### What shipped

- **`docs/eexperience-reconnaissance-checklist.md` pre-filled** via WebFetch. ~11 of 21 questions answered without touching a browser. Human remainder drops from ~30 min to ~10 min in dev tools.

### Key discoveries

- Entry point confirmed: `https://www.eprocure.gov.bd/resources/common/SearcheCMS.jsp` (public, no login)
- 15 form fields identified with labels
- Results table has 10 columns covering every field we need
- Rich filter surface — can pre-filter Work Status=Completed for profile onboarding
- Server-rendered form + AJAX-loaded results; pagination confirmed
- Bilingual English/Bangla toggle
- robots.txt broken (302→SessionTimedOut.jsp); T&C footer is the real policy source
- Form does NOT accept GET-with-params — must POST or AJAX

### Blocker candidates flagged for human step

- Captcha on repeat searches
- T&C automated-access clause

### Honest observation

Four consecutive sessions (7–11) have been either PR-blocked or docs-only. Vercel prod looks exactly like end of Session 3. Real docs have shipped, but nothing user-visible has moved. The two humans in the loop (Mohabbat on PR #8 review; user on eExperience 10-min recon) need to unstick before code can move again.

### Position vs Source of Truth

- Phase 1: **~44%**
- MVP overall (§113 scope-reduced): **~24%**
