# ADR 0004 — Workspace creation: SECURITY DEFINER RPC, no INSERT policies

**Status:** Accepted · **Date:** 2026-09-11 · **Phase:** 0

## Context

Creating a workspace is a **two-row atomic operation**: insert into `public.workspaces` and insert the caller's `public.workspace_members` row as `role='admin', status='active'`. Both need to succeed or neither should.

Doing this from client code with two `INSERT` policies has two problems:

1. **Atomicity.** Client-side "insert, then insert" leaves half-created workspaces if the second call fails or the network drops.
2. **RLS-check-yourself paradox.** The natural INSERT policy for `workspace_members` is *"you may insert a row where you are the workspace owner"*, but the workspaces row you're claiming ownership of doesn't have you as a member yet — you're the one about to become one. The check devolves into "you may insert if you say you own it," which is toothless.

## Decision

- **No INSERT policies** on `public.workspaces` or `public.workspace_members` for anon/authenticated in Phase 0.
- All workspace creation goes through `public.create_workspace(p_name text, p_workspace_type text) returns uuid`, a `SECURITY DEFINER` function owned by `postgres` that:
  1. Reads `auth.uid()`; raises if null.
  2. Validates type ∈ {`individual`, `organization`} and non-empty name.
  3. Generates a slug (`lowercased-name-<6-char-hash>`).
  4. Inserts workspace + owner membership in the same transaction.
  5. Returns the new workspace id.
- `GRANT EXECUTE ON FUNCTION public.create_workspace(text, text) TO authenticated`. Anon has no execute right.
- Read paths (`workspaces_member_select`, `workspace_members_self_select`) go through RLS policies + a `is_workspace_member(uuid)` `SECURITY DEFINER` helper to break the classic self-referential RLS recursion trap.

## Consequences

- RLS integration test (`tests/integration/rls.test.ts`) proves: authenticated users cannot INSERT directly into `workspaces` (they get 42501 permission denied), can only create via the RPC.
- Adding future workspace-write flows (rename, delete, plan change) will follow the same pattern: a `SECURITY DEFINER` RPC per operation. This trades a few extra function definitions for tight, auditable write paths.
- The RPC's search_path is set to `public` explicitly to avoid the schema-hijacking class of vulnerabilities.

## Alternatives considered

- **INSERT policies + client-side two-step.** Rejected on both atomicity and self-referential-check grounds.
- **Trigger on `workspaces` INSERT that auto-creates the membership row.** Considered. Cleaner in one sense, but shifts the atomic transaction to a trigger which is harder to reason about later. RPC is more explicit.
- **Service-role write from a Route Handler.** Rejected — routes everything through service_role code, giving up RLS as a defense in depth.
