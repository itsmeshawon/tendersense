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

## Session 7 — 2026-09-12

**Tier:** MewKing · **Plan:** `proposals/active/phase-1-source-ingestion/plan.md`
**Phase:** Phase 1 — Source ingestion (step 3: adapter contract + normalizer + pii + http)
**First collaborative-project session** — `Project_Status.md` now carries a `collaborators` field so the new rules in `.claude/rules/mew-*` fire on every future TenderSense session.

### What shipped

- **Issue #7 opened** as the shared workqueue item for this PR (per new "Issues first" rule).
- **PR #8 open, awaiting Mohabbat's review** — no self-merge per collaborative rules.
  - `lib/ingest/types.ts` — `ProcurementSourceAdapter`, `NormalizedOpportunity`, page/cursor/health/record/detail (SoT §14, §67)
  - `lib/ingest/normalizer.ts` — `computeContentHash` over material fields (SoT §26); `withComputedHash`
  - `lib/ingest/pii.ts` — `looksLikePII` + `redactOfficialContact` per ADR 0006 §8
  - `lib/ingest/http.ts` — injectable-fetch client with UA, timeout, exp backoff, retry, min-interval throttle
  - 31 new tests; 59 total unit + 10 integration all green
- CI + Vercel preview both green on PR #8
- Session started with correct collaborative flow: `git pull`, `gh issue list`, then Issue-first before any code

### Attempted but blocked

- **GitHub Ruleset for `main`** — API returns 403 on Free tier. Both classic branch protection and modern Rulesets are Pro-only for private repos. Options recorded: pay $4/mo Pro, or continue convention-only. User decision pending.

### Not done (blocking Phase 1 exit)

- Waiting for @mewking2099 review on PR #8; merge after approval
- WB adapter + backfill (next PR)
- Runner + revision detection
- e-GP notices adapter
- Cron workflows
- eExperience lookup + profile-onboarding UI
- Bonus `/opportunities` list (optional)
- Remaining ADRs 0007–0010 + tag `v0.2.0-phase1`

### Position vs Source of Truth

- Phase 1: **~25%** (schema + adapter plumbing in review; 5 more code PRs)
- MVP overall (§113 scope-reduced): **~19–21%**

### Open threads

- Branch protection: **decided 2026-09-12 — convention-only for now.** GitHub Pro deferred; "no self-merge" enforced by rule in `.claude/rules/mew-code/code-rules.md` and by convention among collaborators. Revisit if the team grows past two.
- ADR 0006 §8 PII rule sign-off (now encoded in code + tests)
- eExperience URL + selector reconnaissance (manual, not blocking until PR #8 in plan §5)
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

## Session 12 — 2026-09-12

**Tier:** MewKing · **Plan:** `proposals/active/phase-1-source-ingestion/plan.md`
**Phase:** Phase 1 — Source ingestion (code sprint + handoff merge)

### What shipped

- Live eExperience recon in dev tools; recon checklist marked complete
- **PR #10** — eExperience on-demand lookup (`lib/experience/`). 21 new tests
- **PR #12** — `/opportunities` read-only list. First user-visible route since Session 3
- **PR #13** — 10 sample opportunities + 1 amendment revision (local seed)
- All four open PRs merged (#8, #10, #12, #13) as founder-authorized override

### The override, explicitly logged

User explicitly directed me to merge PR #8, #10, #12, #13 without collaborator review, on grounds that main should be clean before Mohabbat joins live coding. Deliberate one-time exception to `.claude/rules/mew-code/code-rules.md` § "Collaborative projects" (no self-merge). Future PRs return to the reviewed-by-collaborator default.

### End-of-session state on `main` (@ 9c8fa13)

- 87 unit + 10 integration tests passing
- Lint + typecheck + build clean
- Routes: `/`, `/login`, `/auth/callback`, `/dashboard`, `/opportunities`, `/workspaces`, `/workspaces/new`
- ADRs 0001–0010 shipped
- Migrations 0001–0011 on local + hosted
- Vercel prod: `/opportunities` live (empty state until adapters run)

### Position vs Source of Truth

- Phase 1: **~65%**
- MVP overall (§113 scope-reduced): **~30%**

### Open threads carried into session 13

- WB adapter — `lib/ingest/types.ts` now on main
- eExperience UI wrap — server action + profile-onboarding form
- BRAC IT name on e-GP — before pilot demo scheduling
- PII rule formal sign-off
- Data-residency counsel question (drafted, awaiting filing)
- T&C automated-access clause at eprocure.gov.bd

- **2026-09-12 06:14** — auto-wrap: modified egp-notices-reconnaissance-checklist.md [auto-wrap]

## Session 16 — 2026-09-12

**Phase:** Phase 1 (e-GP adapter + filter bar + finalization docs)

### What shipped

- **PR #23** — e-GP notices adapter (built first-try from user's dev-tools recon on `AllTenders.jsp` / `TenderDetailsServlet`). 11 new tests.
- **PR #25** — `/opportunities` filter bar (source / country / deadline / status; URL-param-driven, bookmarkable).
- **docs/egp-notices-reconnaissance-checklist.md** — captures the notices-search POST + response shape
- **docs/phase-1-finalization-checklist.md** — paint-by-numbers plan for Mohabbat to close Phase 1 after 6-PR merge

### PR queue at session end (all independent, awaiting Mohabbat)

#15 · #17 · #19 · #21 · #23 · #25 (six PRs)

### Position vs Source of Truth

- Phase 1: **~95%** code complete; remaining is ~90 lines of glue + cron YAML + tag (documented in the finalization checklist)
- MVP overall (§113 scope-reduced): **~45%**

## Session 17 — 2026-09-12

**Phase:** Phase 2 (Discovery) + Phase 3 (Matching) — plans drafted

### What shipped

- **`proposals/active/phase-2-discovery/plan.md`** — BPPA + NOA + APP adapters, `monitoring_profiles` + `saved_searches` + `notifications` (migrations 0012–0015), FTS + sort on `/opportunities`, amendment badges, `/dashboard` hub, notifications bell. 10 PRs sequenced; ADRs 0011–0014 called out. Size: 3–5 weeks. Blocker risk: APP data-shape recon (may be PDF-only).
- **`proposals/active/phase-3-matching/plan.md`** — deterministic scoring engine across 9 dimensions, `opportunity_matches` table (migrations 0016–0017), grade UI per ADR 0006 §5 (A/B/C/D + Not-eligible + Need-more-info), `lib/matching/` library, recompute triggers, capabilities tab, calibration methodology. ADRs 0015–0018. Size: 4–6 weeks.

### Why plan both now

Mohabbat is clearing the 6-PR queue + running the finalization checklist to close Phase 1. That work does not need Claude. Drafting Phase 2 + Phase 3 in parallel keeps the planning gate unblocked so execution can start the moment Phase 1 tags `v0.2.0-phase1`.

### Not shipped this session

- Neither plan has been approved yet — MewKing tier hard gate holds until user reviews.
- No code touched. No PRs opened.

### Position vs Source of Truth

- Phase 1: **~95%** (unchanged — awaiting Mohabbat)
- MVP overall (§113 scope-reduced): **~45%** (unchanged; planning ≠ shipping)

### Open threads carried into session 18

- Phase 2 plan awaiting approval (6 open questions listed in plan §6)
- Phase 3 plan awaiting approval (open questions in plan)
- 6 PRs awaiting Mohabbat's review
- Phase 1 finalization checklist awaiting Mohabbat's execution

- **2026-09-12 06:56** — auto-wrap: modified log.md, Project_Status.md, plan.md +1 more [auto-wrap]

- **2026-09-12 06:59** — auto-wrap: session ended [auto-wrap]

- **2026-09-12 07:02** — auto-wrap: session ended [auto-wrap]

- **2026-09-12 07:05** — auto-wrap: modified plan.md [auto-wrap]

- **2026-09-12 07:06** — auto-wrap: session ended [auto-wrap]

- **2026-09-12 07:08** — auto-wrap: modified plan.md [auto-wrap]

- **2026-09-12 07:14** — auto-wrap: session ended [auto-wrap]

- **2026-09-12 07:17** — auto-wrap: modified plan.md [auto-wrap]

## Session 18 — 2026-09-12

**Phase:** Phase 2 + Phase 3 plan revisions (v2)

### What shipped

- **Phase 2 plan v2** (`168f3e1`) — cut NOA + APP adapters (§1a rationale: neither serves §113 exit criterion; APP has unquantified PDF blocker; Phase 3 matters more). Kept BPPA. Locked 3 open-question decisions as pending ADRs 0012–0014 (`websearch_to_tsquery` for FTS; red-badge-for-deadline-only; NOA/APP deferral into future `awards` + `procurement_plans` tables). Sequencing 10 PRs → 8 PRs. Size 3–5 weeks → **~3 weeks**.
- **Phase 3 plan v2** (`470a10f`) — trimmed scoring model 9 → 5 dimensions. Cut: credential signal (Phase 4 data), source preference (redundant with monitoring-profile filter), method preference (same), timeline suitability (kept as sort/chip in Phase 2, not scored). Reweighted remaining 5 to 100. Added cold-start capability auto-derive from imported eExperience projects (§2b) — solves fresh-workspace "Need more info" wall on day 1. Dropped on-demand recompute API (defer to ops/Phase 6). Replaced impossible "80% agreement" calibration gate with ~12 hand-labeled tenders + `scoring_version` telemetry for post-launch retune. Size 4–6 weeks → **~3 weeks + 1–2 week calibration tail**.

### Deferrals recorded (so nothing silently drops)

- Phase 3 §2a "Deferred / cut signals" table — 4 signals with weight + reason + recovery path
- Phase 3 §11 "Explicitly deferred (with owner path)" — restated in blocker section
- ADR 0016 (`0016-deferred-scoring-signals.md`, to be written at execution time) will lock the recovery paths in decisions/
- Credential signal restore is a **Phase 4 dependency** — flagged so it doesn't get forgotten when Phase 4 lands the credentials table

### Phase 1 status (unchanged from session 17)

- 6 PRs still open awaiting Mohabbat's review (#15, #17, #19, #21, #23, #25)
- Finalization steps 2–6 (sync scripts, cron YAML, backfill, verify, tag) blocked on those merges
- No self-merge — Session 12's override was explicitly a one-time exception

### Position vs Source of Truth

- Phase 1: **~95%** (unchanged; blocked on Mohabbat)
- MVP overall (§113 scope-reduced): **~45%** (planning ≠ shipping)

### Open threads carried into session 19

- Phase 2 plan v2 awaiting approval (open questions: Q2 recompute path, Q5 notification decay, Q6 free-plan wording)
- Phase 3 plan v2 awaiting approval (open questions: Q1 taxonomy, Q2 excluded-keywords, Q3 no-profile chip, Q5 blocking-vs-eventual, Q6 shortlist grade, Q7 auto-derive precision)
- 6 PRs awaiting Mohabbat's review
- Phase 1 finalization checklist awaiting Mohabbat's execution

- **2026-09-12 07:19** — auto-wrap: modified Project_Status.md [auto-wrap]

- **2026-09-12 07:20** — auto-wrap: session ended [auto-wrap]

- **2026-09-12 07:22** — auto-wrap: session ended [auto-wrap]

- **2026-09-12 07:23** — auto-wrap: session ended [auto-wrap]

- **2026-09-12 07:28** — auto-wrap: modified plan.md, plan.md, Project_Status.md [auto-wrap]

## Session 19 — 2026-09-12

**Phase:** Phase 2 + Phase 3 plan approval

### What shipped

- **All 9 remaining open questions resolved** in one working session (3 Phase 2 + 6 Phase 3)
- **Phase 2 plan v2 APPROVED** — §6 flipped from "open questions" to "decisions" with resolutions locked in-file
- **Phase 3 plan v2 APPROVED** — §7 same treatment
- `Project_Status.md`: added `phase_2_plan_approved: true` + `phase_3_plan_approved: true` (both dated 2026-09-12)
- Commit `4a796f4` on `main`

### Key decisions locked

**Phase 2:**
- Monitoring profile match: server-side query on `/opportunities` load (promote to materialized view only when volume forces it)
- Notification decay: 30 days in bell, permanent in `/notifications` audit list
- Free-plan gate wording: offers "deactivate existing profile" as in-plan action alongside the upgrade path

**Phase 3:**
- Capability taxonomy: SoT §16.7's 10 keys as fixed seed for MVP; custom disallowed until Pro (preserves scorer comparability)
- Excluded_keywords: case-insensitive, word-boundary aware (`\b<kw>\b` + `i` flag)
- No-profile chip: synthetic "Not yet ranked" in gray + "Complete your profile" CTA (not null-hidden)
- Grade recompute timing: eventual with optimistic UI + `revalidatePath` after chunks (Vercel timeout makes blocking non-viable)
- Shortlist grade after re-score drop: show new grade + `↓ was A` delta marker
- Cold-start auto-derive precision: ≥ 2 signal words per bucket + "Suggested" badge (precision over recall)

### Rule override this session

User explicitly directed Claude to walk through the open questions solo, waiving the collaborator-review preamble ("ignore the Collaborator rule. I can do it myself"). Plan approval done as founder decision, not collaborative sign-off. Recorded here for the shared brain. Does not extend to PR merges.

### Phase 1 status (unchanged from sessions 17–18)

- 6 PRs still open awaiting Mohabbat (#15/17/19/21/23/25)
- No self-merge — session 12's override remains the single one-time exception
- Finalization steps 2–6 blocked on those merges

### Position vs Source of Truth

- Phase 1: **~95%** (unchanged; blocked on Mohabbat)
- MVP overall (§113 scope-reduced): **~45%** (unchanged; approval ≠ shipping)

### Open threads carried into session 20

- Phase 2 execution starts as soon as Phase 1 tags `v0.2.0-phase1`
- First Phase 2 PR: migrations 0012–0015 (monitoring_profiles + saved_searches + notifications)
- Phase 3 execution starts after `v0.3.0-phase2`
- 6 Phase 1 PRs still awaiting Mohabbat's review

- **2026-09-12 07:29** — auto-wrap: modified Project_Status.md [auto-wrap]

- **2026-09-12 07:33** — auto-wrap: modified 0011-solo-merge-during-mohabbat-hiatus.md, CLAUDE.md, tender_sense_solo_merge.md +2 more [auto-wrap]

- **2026-09-12 07:35** — auto-wrap: session ended [auto-wrap]

- **2026-09-12 07:36** — auto-wrap: session ended [auto-wrap]

- **2026-09-12 07:39** — auto-wrap: session ended [auto-wrap]

- **2026-09-12 07:43** — auto-wrap: session ended [auto-wrap]

- **2026-09-12 07:45** — auto-wrap: session ended [auto-wrap]

- **2026-09-12 07:49** — auto-wrap: session ended [auto-wrap]

- **2026-09-12 07:50** — auto-wrap: session ended [auto-wrap]

- **2026-09-12 07:52** — auto-wrap: session ended [auto-wrap]

## Session 19 (cont.) — 2026-09-12 · queue drained

### Rule change

- **ADR 0011** committed (`4e237e9`): scope-limited waiver of no-self-merge on tendersense while Mohabbat is fully occupied on another project. Branch → PR → CI still required. Reversion trigger: Mohabbat returns to active review capacity. Memory + CLAUDE.md updated to match.

### Six PRs merged (all Phase 1)

- **#19** — runner + persistence + revision detection (`60e0ac8`)
- **#23** — e-GP notices adapter (`9cef243`)
- **#25** — /opportunities filter bar (`4cff20a`)
- **#15** — World Bank adapter (`a133e71`) — rebased over log.md/Project_Status.md conflicts
- **#17** — eExperience UI wrap / Peak 1 (`d3582ad`) — rebased, 9 commits collapsed to 7 after wrap-commit no-ops
- **#21** — /workspaces/[id] detail page (`7f70a14`) — rebased

All squash-merged with `--delete-branch`. Force-pushes used `--force-with-lease`. All CI green pre-merge.

### State on `main` at wrap

- Every Phase 1 code deliverable landed: adapters (WB, e-GP notices, eExperience lookup), runner, persistence, `/opportunities` list + filters, `/workspaces/[id]` detail, onboarding UI
- **Not yet on main:** sync scripts (Phase 1 checklist step 2), cron workflows (step 3), backfill (step 4), tag `v0.2.0-phase1` (step 6)
- Vercel prod `/opportunities` still empty until cron runs

### Phase 2 open threads confirmed

- Recompute discipline still holds: monitoring profile match = server-side query on load (§Q2)
- Notifications: 30d in bell, permanent in `/notifications` (§Q5)
- Free-plan gate wording drafted (§Q6)

### Position vs Source of Truth

- Phase 1: **~99%** (code complete; just needs sync scripts + cron + tag)
- MVP overall (§113 scope-reduced): **~50%**

### Open threads carried into session 20

- Phase 1 finalization: sync scripts + cron workflows + GitHub Actions Secrets + backfill + tag v0.2.0-phase1
- Phase 2 first PR: migrations 0012–0015 (monitoring_profiles + saved_searches + notifications)
- e-GP `procNature`/`procMethod` numeric codes — 5-min recon before cron floods with Goods-only results
- Revision auto-numbering fix (runner.ts hardcodes `revisionNo: 1`)
- BRAC IT name mismatch on e-GP (pilot demo blocker)
