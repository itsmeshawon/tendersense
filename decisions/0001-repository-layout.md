# ADR 0001 — Repository layout: `apps/web/`

**Status:** Accepted · **Date:** 2026-09-11 · **Phase:** 0

## Context

TenderSense is scaffolded as a single Next.js app at commit time, but the SoT foresees at least one non-web workload (§10, §12 — GitHub Actions cron adapters for World Bank + BPPA/e-GP ingestion). The scheduled adapter workflows are declarative YAML, but the extraction logic they call is TypeScript/Node code that reads and writes the same Supabase project as the web app.

Deciding upfront where "second app" code lives avoids a painful refactor later. Two shapes:

- **Flat** — everything under repo root; a single `package.json`. Simplest. What SoT §66 sketches.
- **Monorepo-ish** — `apps/<name>/` per deployable unit, each with its own `package.json`. More setup.

## Decision

Adopt `apps/<name>/` from day one. Phase 0 ships with only `apps/web/`; the layout leaves room for `apps/workers/` (or similar) without a repo-wide move.

- Root of repo holds cross-cutting concerns: `supabase/`, `decisions/`, `proposals/`, `docs/`, `raw/`, `.github/workflows/`, project `CLAUDE.md`, `Project_Status.md`, `log.md`.
- Each `apps/<name>/` is a standalone npm package with its own `package.json`, `tsconfig.json`, tests, and env files.
- No workspaces / turbo / lerna today. If we grow to a second app that shares code, we introduce a `packages/` dir and `npm workspaces` at that point.

## Consequences

- Vercel needs its Root Directory pointed at `apps/web/` (done — see project settings).
- CI (`.github/workflows/ci.yml`) uses `defaults.run.working-directory: apps/web`.
- Import paths inside `apps/web/` stay short (`@/lib/...`); no cross-app imports permitted until a shared `packages/` is introduced.

## Alternatives considered

- **Flat layout (SoT §66 sketch).** Rejected because SoT §10–12 already imply a second runtime for ingestion; moving from flat → monorepo later would touch every file in git blame.
- **Full turborepo / npm workspaces now.** Rejected as premature. Nothing is shared between apps yet.
