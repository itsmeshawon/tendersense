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
