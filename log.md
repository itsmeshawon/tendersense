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
