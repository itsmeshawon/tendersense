# Plan: Phase 0 — Foundation

**Tier:** MewKing
**Status:** Drafting → awaiting approval
**Master spec:** `raw/TenderSense_MVP_Source_of_Truth.md` (§113 Phase 0, §8, §15–17, §66, §97, §98, §99)
**Exit criteria (SoT §113):** *"user can sign in and create a workspace securely"*

---

## 1. Scope

Phase 0 sets up the infrastructure and the smallest end-to-end vertical slice that proves the stack works: a signed-in user can create a workspace, and RLS keeps their data private.

**In scope**
- Next.js App Router + TypeScript + Tailwind + shadcn/ui project scaffold
- Supabase project (dev + prod) with local dev via Supabase CLI
- Migration tooling and the first migration set (0001–0004)
- Supabase Auth wiring (email/password + magic link)
- Repository/service layer boundary (SoT §8 dependency direction)
- Workspace + workspace_members tables and RLS
- One protected route that reads the current user's workspaces
- GitHub repo + Vercel deploy (production + preview envs)
- CI: type-check, lint, unit tests, migration lint on every PR

**Not in scope for Phase 0**
- Any source ingestion (Phase 1)
- Any opportunity / matching / assessment schema (Phases 1–4)
- Team invites, roles beyond `admin` (Phase 5)
- Evidence / document upload (arrives with Phase 4 or when needed)
- Email (Resend) beyond Supabase built-in auth email
- Feature gating middleware — a stub is fine (SoT §42 lands in Phase 1)

---

## 2. Deliverables

### 2.1 Repository skeleton (SoT §66)

```
apps/web/                          # Next.js app (single-app monorepo layout, room to grow)
  app/
    (marketing)/page.tsx           # public landing (placeholder)
    (auth)/login/page.tsx
    (auth)/signup/page.tsx
    (app)/workspaces/page.tsx      # protected: list current-user workspaces
    (app)/workspaces/new/page.tsx  # protected: create workspace
    api/v1/workspaces/route.ts     # POST create workspace (server action alt)
  lib/
    supabase/server.ts             # server-side client (RLS-respecting)
    supabase/client.ts             # browser client
    supabase/service.ts            # service-role client (server-only guard)
    auth/session.ts                # getServerUser() helper
    workspaces/repository.ts       # data access
    workspaces/service.ts          # business logic
  components/ui/                   # shadcn primitives
  tests/                           # vitest
supabase/
  migrations/                      # SQL migrations under version control
  seed.sql                         # local dev seed
  config.toml
.github/workflows/
  ci.yml                           # typecheck, lint, test, migration-lint
```

Note: SoT §66 shows a flatter layout. I'm proposing `apps/web/` to leave room for a future `apps/workers/` if ingestion outgrows GitHub Actions. **Open question 1 below.**

### 2.2 Migrations

- `0001_extensions.sql` — `citext`, `pgcrypto` (uuid), `pg_trgm` (search prep)
- `0002_profiles.sql` — `profiles` table (SoT §16.1), trigger on `auth.users` insert
- `0003_workspaces.sql` — `workspaces` (§16.2) + `workspace_members` (§16.3)
- `0004_signup_allowlist.sql` — `allowed_signup_emails` table + `on_auth_user_created` trigger that gates by allowlist
- `0005_rls.sql` — enable RLS + policies (SoT §17)

RLS policies for Phase 0:
- `profiles`: user can select/update their own row
- `workspaces`: select if `exists(workspace_members where user_id = auth.uid() and status='active')`; insert requires the inserter to also insert a member row in the same transaction (via SECURITY DEFINER function)
- `workspace_members`: same membership rule; admin-only for insert/update/delete

Introduce a `create_workspace(name text, workspace_type text)` SECURITY DEFINER function that inserts the workspace + creates the owner's `workspace_members` row atomically. This is the only way clients create workspaces in Phase 0.

### 2.3 Auth flows

- Magic-link only. Enter email → Supabase sends link → click → session established.
- Signup and login are the same flow; the allowlist trigger blocks unknown emails at the Supabase Auth layer.
- Server-side session helpers via `@supabase/ssr`
- `middleware.ts` refresh + redirect unauthenticated users out of `(app)/*`

Email templates use Supabase defaults for Phase 0. Resend integration deferred to Phase 6 (SoT §90).

### 2.4 CI/CD

- GitHub Actions `ci.yml`:
  - `npm ci`
  - `npm run typecheck`
  - `npm run lint`
  - `npm test` (vitest)
  - `supabase db lint` on migration files (schema linter)
- Vercel: connect repo, prod deploys from `main`, previews on PR
- Environment variables (SoT §97): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only), `SUPABASE_DB_URL` (migrations)
- Add `.env.example` with placeholders; real values in Vercel + local `.env.local` (gitignored)

### 2.5 Tests

- Unit: `workspaces/service.ts` (Vitest, mocked repository)
- Integration: RLS proof — two test users, user A creates workspace, user B cannot see it (against local Supabase)
- Playwright deferred to Phase 2 when there are real UI flows

---

## 3. Decisions to record (ADRs)

Draft during execution, land at Finalize:

- `decisions/0001-repository-layout.md` — apps/web vs flat
- `decisions/0002-package-manager.md` — pnpm (proposed)
- `decisions/0003-supabase-clients.md` — three-client pattern (server / browser / service)
- `decisions/0004-workspace-creation.md` — SECURITY DEFINER function vs direct insert

---

## 4. TDD gate

Per silo rules, `src/` and `lib/` files get a test first. Order per module:

1. Write test file (`*.test.ts`) that fails
2. Implement the module
3. Green

The RLS integration test is written before migration 0004 is applied.

---

## 5. Sequencing

1. Repo scaffold + Next.js + Tailwind + shadcn init
2. Supabase local dev up; migrations 0001–0004
3. Server-side supabase clients + session helper
4. Auth pages (login, signup) + middleware
5. `create_workspace` RPC + service + repository
6. Protected workspaces list + create page
7. Vercel + GitHub Actions CI
8. RLS integration test proves isolation
9. Deploy to Vercel; verify auth + workspace create in production
10. Finalize: ADRs, update Project_Status.md, tag `v0.1.0-phase0`

---

## 6. Decisions (2026-09-11)

1. **Repo layout**: `apps/web/` — room for `apps/workers/` later.
2. **Package manager**: **npm**. `package-lock.json` committed. CI uses `npm ci`.
3. **Supabase**: region `ap-south-1` (Mumbai). Provision after plan approval.
4. **GitHub**: repo `tendersense`, personal account (shawon).
5. **Vercel**: personal account, `.vercel.app` domain for MVP. Custom domain deferred.
6. **Auth**: **magic link only** for pilot. Email+password can be enabled later via Supabase dashboard without migration. Supabase built-in email for now; Resend swap deferred to Phase 6 (SoT §90).
7. **Signup gate**: **invite-only allowlist** for pilot. Add table:
   ```sql
   allowed_signup_emails
   - email citext pk
   - invited_by uuid null
   - invited_at timestamptz
   - note text null
   ```
   Signup flow (server action) checks the allowlist before creating the profile row. Include the check inside the `on_auth_user_created` trigger — if the email isn't allowed, delete the `auth.users` row and return an error. Seed with your email + BRAC IT contact + a few demo emails. Additions are a one-line SQL for now (admin UI deferred).

---

## 7. Exit checklist

- [ ] `npm run dev` runs locally against local Supabase
- [ ] Allowlisted email can request magic link, click it, land in the app
- [ ] Non-allowlisted email is rejected at auth (no `auth.users` row remains)
- [ ] Logged-in user can create a workspace via the UI
- [ ] Second user cannot see the first user's workspace (RLS integration test green)
- [ ] `main` deploys to Vercel; production magic-link auth works end-to-end
- [ ] CI green on PR: typecheck + lint + vitest + `supabase db lint`
- [ ] Four ADRs committed
- [ ] `Project_Status.md` updated: `current_phase: "Phase 1 — Source ingestion (planning)"`

---

## 8. Rough size

Solo founder pace estimate: **5–8 working days**. Bulk is auth wiring + first RLS policies (nobody gets those right on first try) + CI. Not counting external account provisioning wait time.
