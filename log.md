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
