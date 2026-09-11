# ADR 0003 — Supabase clients: three-file pattern with server-only guard

**Status:** Accepted · **Date:** 2026-09-11 · **Phase:** 0

## Context

`@supabase/ssr` splits its client factories by runtime: `createBrowserClient` for React client components, `createServerClient` for server components / route handlers / server actions (with Next.js cookies wiring). A third case — server-only "admin" code that must bypass RLS — needs the plain `@supabase/supabase-js` client with the service_role key.

Getting these three mixed up is a known foot-gun. Historic incidents in similar codebases:

1. Bundling a service_role key into the browser via a bad import graph.
2. Losing cookie context in server components by using the browser client.
3. Using the service_role client for user-scoped reads and inadvertently bypassing RLS.

## Decision

Three separate files under `apps/web/lib/supabase/`:

- **`client.ts`** — `createBrowserSupabaseClient()`. Reads `NEXT_PUBLIC_*` env. Safe to import from `"use client"` components.
- **`server.ts`** — `createServerSupabaseClient()`. Async (awaits `next/headers` `cookies()`). Reads `NEXT_PUBLIC_*` env. RLS-scoped as the signed-in user.
- **`service.ts`** — `createServiceRoleClient()`. Reads `SUPABASE_SERVICE_ROLE_KEY`. **Bypasses RLS.** First line of the function throws if `typeof window !== "undefined"` — a crash-fast guard against accidental client-bundle inclusion.

Env accessors live in a fourth file `env.ts` — throws on missing or empty vars, keeps error messages consistent.

Repositories (`lib/workspaces/repository.ts`, future `lib/opportunities/repository.ts`, etc.) accept a `SupabaseClient` as an argument. Services (`lib/workspaces/service.ts`) instantiate the right client and pass it in. This lets us unit-test repositories with a fake client, and lets us reuse the same repository from both a user-scoped path (server client) and an admin path (service-role client) without duplicating query logic.

## Consequences

- All three clients are covered by tests in `lib/supabase/*.test.ts`.
- The service-role guard has an explicit test asserting it throws in a browser-like environment.
- Services must be careful not to accidentally use the service-role client for user-facing reads; there's no compiler enforcement, only convention + code review.

## Alternatives considered

- **Single "smart" factory** that picks the right client from runtime hints. Rejected — turns imports opaque and makes bundle analysis harder.
- **Skip the service-role client entirely** and route everything through RPC / RLS. Rejected because integration tests and future admin scripts need a way in; better to have a locked door than no door.
- **`"server-only"` package** to enforce server-only imports at build time. Considered — worth adopting when the codebase grows; for Phase 0 the runtime guard is enough.
