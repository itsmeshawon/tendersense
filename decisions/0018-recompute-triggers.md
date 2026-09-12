# 0018 — Two recompute triggers + batched writes; on-demand API deferred

**Status:** Accepted 2026-09-12
**Phase:** 3 (Matching) v2 §3.3 + §Q4

## Context

`opportunity_matches` needs to stay in sync with two moving targets:

1. **New / amended opportunities** — the runner writes revisions to `opportunity_revisions` on content_hash changes. If a workspace already has a match for that opportunity, the match is now stale.
2. **Workspace profile changes** — creating, activating, deactivating, or deleting a monitoring profile; adding, confirming, or removing capabilities. The workspace's scoring vector changed; every recent match needs re-scoring.

The plan originally sequenced three triggers, including an on-demand admin API (`POST /matches/recompute`). During review we cut it.

## Decision

**Two triggers, one deferral:**

### Trigger 1 — `recomputeForOpportunity(opp)`
Called by the ingest runner after every create + revision write. Loads every workspace with at least one active monitoring profile, scores the opportunity against each, upserts a match row. Best-effort — failures log and continue; the ingest record has already been persisted.

### Trigger 2 — `recomputeForWorkspace(workspaceId)`
Called by profile-mutation server actions:
- `/monitoring/actions.ts` — createProfile / toggleActive / deleteProfile
- `/capabilities/actions.ts` — addCapabilities / removeCapability
- `projects-service.importExperienceRecords` — after cold-start auto-derive

Scans last **90 days** of opportunities (`Q4` decision — older tenders are unlikely to be actionable) and upserts a match for each.

### Deferred — on-demand API

`POST /api/v1/workspaces/[id]/matches/recompute` is not shipped in Phase 3. Users don't press "recompute matches" as a UX; if the pipeline needs a manual retune, an ops script hitting the runner suffices. Ship only when there is a concrete user story.

## Batching (added in fix PR #49)

Both triggers use `upsertMatchesBulk` — one supabase round-trip per 100-row chunk instead of one per opportunity. On the hosted pipeline this brought a full `recomputeForWorkspace` from ~30 s (blocking the server action) to ~2 s. Without this, the "add capability" click felt broken.

## Consequences

- Every workspace mutation blocks its server action for ~2 s while the recompute runs. Acceptable at pilot volume. If this becomes a bottleneck, next moves in order: (a) fire-and-forget via `after()` (Next.js 16), (b) queue to a background worker, (c) materialize a Postgres view instead of upserting.
- **Trapdoor** — service-role client required. The `opportunity_matches` migration grants `insert/update/delete` only to `service_role`. Server actions using the user-session client silently fail RLS and leave the table empty (surfaced + fixed in PR #46). Any new call site into `recompute*` must pass a service-role Supabase client.
