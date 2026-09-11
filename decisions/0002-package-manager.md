# ADR 0002 — Package manager: npm

**Status:** Accepted · **Date:** 2026-09-11 · **Phase:** 0

## Context

Node projects choose between npm, pnpm, yarn, or bun. Each has trade-offs; the choice affects `package-lock.json` shape, CI cache setup, Vercel build detection, and developer setup friction.

## Decision

Use **npm**, pinned by `package-lock.json` committed at `apps/web/package-lock.json`. CI runs `npm ci`.

## Consequences

- No extra install step for new contributors — npm ships with Node.
- Vercel auto-detects npm from `package-lock.json`; no build-command override needed.
- Slower than pnpm on cold installs, but Phase 0's dep tree is small enough (< 400 packages) that the difference is negligible.

## Alternatives considered

- **pnpm.** Faster installs, disk-efficient. Rejected for now because it adds a "install pnpm first" onboarding step and CI cache config, with no measured payoff at Phase 0 scale.
- **bun.** Fastest, but immature ecosystem for Next.js server actions + `@supabase/ssr` (as of 2026-09). Revisit if performance becomes a concern.
- **yarn.** Slower than pnpm, no unique advantage over npm today.

Revisit when repo grows past ~1000 packages or `npm install` cold time exceeds 90s.
