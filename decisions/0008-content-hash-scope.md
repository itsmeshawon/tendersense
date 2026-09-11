# ADR 0008 — Content-hash scope: which fields count as an amendment

**Status:** Accepted · **Date:** 2026-09-12 · **Phase:** 1

## Context

The ingestion runner detects amendments by comparing `content_hash` between the newly-fetched normalized opportunity and the existing DB row. When the hash changes, a revision is written and a Pro user gets a deadline-changed / method-changed / amendment alert (Phase 6). When the hash doesn't change, the row is a silent re-sync.

Getting the field list wrong burns users in one of two directions:

1. **Too broad** — every reference-number tweak or tag re-ranking fires a false amendment. Users tune out the notifications.
2. **Too narrow** — a real deadline extension slips through as a silent re-sync. Users miss the notice they most needed.

SoT §26 lists the material fields (deadline, title, eligibility text, procurement method, submission location, document URL, scope text, financial thresholds, security amount). SoT §14 defines the full canonical shape. The union of the two isn't the answer; the SoT §26 list is.

## Decision

Fields hashed by `computeContentHash` in `apps/web/lib/ingest/normalizer.ts`:

- `sourceKey`
- `externalId`
- `title`
- `description`
- `deadlineAt`
- `procurementMethod`
- `procuringEntityName`
- `sourceUrl`
- `estimatedValueMin`
- `estimatedValueMax`

Fields deliberately NOT hashed:

- `referenceNo`, `tags`, `sector` — cosmetic / index-derived; source can re-tag without material change
- `firstSeenAt`, `lastSeenAt` — ingestion metadata
- `noticeType`, `procurementCategory` — descriptive, rarely change materially; not on SoT §26 list
- `countryCode`, `countryName`, `region`, `district` — geography; if it moves that much, it's a new tender
- Anything about procuring-entity officials — see ADR 0006 §8 (PII stance; not indexed at all)

## Consequences

- Revision detection catches deadline changes, retitles, method flips (ICB→LCB), procuring-entity re-attribution, scope-text edits (via `description`), value-range shifts, and URL moves.
- Revision detection deliberately ignores tag / sector re-ranking noise.
- Hash is a deterministic SHA-256 over a `key=value\n` join with a fixed field order. Not `JSON.stringify` — object key order isn't guaranteed cross-runtime and would silently invalidate every hash on a Node upgrade.
- If the SoT §26 list changes, this ADR gets a new revision and the hash function bumps a version number; every existing hash becomes stale on next sync (fine — the runner treats a stale hash as "no revision detected on this pass, will recompute next time").

## Alternatives considered

- **Hash everything.** Rejected — false amendments (see Context above).
- **Hash only `title` + `deadlineAt`.** Rejected — misses procurement-method and scope changes users care about.
- **Per-adapter hash function.** Rejected — different sources would compute different hashes for logically-equivalent records, defeating cross-source dedup logic if we ever add it.

## When to revisit

- If we start getting user complaints about missed amendments, check whether the material change was outside the hashed set.
- If we start getting user complaints about noisy amendments, look at what non-material field is drifting on the source side.
