# TenderSense

Tender **discovery** and **qualification** platform. Not a submission tool — we help teams find the right opportunities earlier, understand whether they qualify, and decide what to pursue before it is too late.

**Pilot customer:** BRAC IT Services (Bangladesh).
**Production:** https://tendersense-delta.vercel.app (private repo, allowlisted signup).
**Status:** Phase 1 (Source Ingestion). Foundation shipped at tag `v0.1.0-phase0`.

---

## What this repo is

A single Next.js app under `apps/web/`, backed by Supabase (Postgres + Auth + Storage) hosted in `ap-south-1` (Mumbai), deployed to Vercel. Cron ingestion runs from GitHub Actions.

Full spec: **`raw/TenderSense_MVP_Source_of_Truth.md`** + **`raw/TenderSense-SOT-Changes (1).md`** (2026-09-09 revision). Where the two disagree, the changes doc wins. `decisions/0006-sot-2026-09-09-scope.md` concentrates the delta.

## Directory layout

```
apps/
  web/                     # Next.js 16 app (App Router, TypeScript, Tailwind v4)
    app/                   # routes: /login, /auth/callback, /dashboard, /workspaces
    lib/
      auth/                # session helpers
      supabase/            # server / browser / service-role clients (three-file pattern)
      workspaces/          # repository + service for workspaces
      ingest/              # source-adapter contract + normalizer + PII + HTTP (Phase 1)
    tests/integration/     # RLS + adapter integration tests
supabase/
  migrations/              # timestamped SQL migrations
  seed.sql                 # local-only signup allowlist seed
  config.toml              # local stack config (ports shifted to 5433x)
decisions/                 # ADRs — the shared architectural memory
proposals/
  MASTER_SPEC.md           # pointer to the two SoT docs + phase index
  active/                  # in-flight MewKing plans (one per phase)
docs/                      # runbooks, demo scripts, counsel questions
raw/                       # immutable source-of-truth documents
```

## Getting started (contributors)

Onboarding for a new collaborator:

1. **Clone** and set your email as a Git author.
   ```
   git clone https://github.com/itsmeshawon/tendersense.git
   cd tendersense/apps/web
   ```
2. **Install** dependencies with npm (package-lock.json is committed).
   ```
   npm ci
   ```
3. **Env vars** — ask the founder for the four Supabase values. Never share them in chat. Put them into `apps/web/.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   SUPABASE_DB_URL=          # session pooler URL, not direct
   ```
   See `apps/web/.env.example` for shape reminders.
4. **Allowlist your email.** Signup is invite-only — the founder adds you via SQL:
   ```sql
   insert into public.allowed_signup_emails (email, note)
   values ('you@example.com', 'engineer');
   ```
5. **Run**:
   ```
   npm run dev            # http://localhost:3000 (or 3001 if 3000 taken)
   npm test               # unit tests
   npm run test:integration    # needs local Supabase running (see below)
   npm run lint
   npm run typecheck
   npm run build
   ```

### Local Supabase (optional but recommended)

For destructive tests (RLS integration test, migration experiments):

```
# From repo root
supabase start
supabase db reset --local       # applies migrations + seed
```

Local ports are shifted to `5433x` so this project can run alongside other Supabase projects. The Studio is at http://127.0.0.1:54333.

## How we work

This is a **collaborative project** (see `Project_Status.md` → `collaborators`). Rules:

- **Every non-trivial change goes through a feature-branch PR.** No self-merge; a collaborator reviews before merge. Convention only — no GitHub branch protection on our tier.
- **Issues first** for Stalk/MewKing work — the issue is the shared workqueue; `log.md` is the session narrative.
- **ADRs are shared memory.** Architectural decisions go in `decisions/<NNNN>-<slug>.md`, not personal notes.
- **Test-first (TDD gate)** for `lib/` files — the pre-commit hook warns if you skip the test.
- **`raw/` is immutable.** The source-of-truth documents live there.
- **Trivial fixes** (typos, docs, session wraps) may go direct to `main`.

Details:
- `.claude/rules/mew-common/vault-rules.md` — vault-wide rules
- `.claude/rules/mew-code/code-rules.md` — code-silo rules
- `decisions/0005-git-workflow.md` — branch + PR + squash-merge convention

## Deploy targets

- **Production**: Vercel `main` → https://tendersense-delta.vercel.app. Env vars in Vercel dashboard, not committed.
- **PR previews**: Vercel builds a preview URL per PR automatically.
- **Hosted Supabase**: single project (`tatkdyjukxzibvaqpoau`, `ap-south-1`). Migrations pushed with `supabase db push --db-url $SUPABASE_DB_URL`.

## Where to start reading

If you're new to this repo, read in this order:

1. `raw/TenderSense_MVP_Source_of_Truth.md` — the product spec (long).
2. `raw/TenderSense-SOT-Changes (1).md` — the 2026-09-09 delta (short).
3. `Project_Status.md` — current focus + next action.
4. `proposals/active/` — in-flight plans for the current phase.
5. `decisions/` — how we decided what we decided.
6. `log.md` — session-by-session narrative.

## Contact

- Founder: **shawon** — `mahedisalim@gmail.com` (GitHub: `itsmeshawon`)
- Engineer: **mohabbat** — `mohabbat2099@gmail.com` (GitHub: `mewking2099`)

Product info: **https://tendersense.app** (site not yet built as of Phase 1).
