# 0012 — Full-text search on `/opportunities` uses `websearch_to_tsquery`

**Status:** Accepted 2026-09-12
**Phase:** 2 (Discovery) v2 §Q3

## Context

`/opportunities` needs free-text search on tender titles + descriptions. Migration 0009 already ships a `search_text` tsvector column plus a GIN index — the question is which query dialect the app hands to Postgres.

Two options were on the table:

- **`plainto_tsquery`** — treats the input as a sequence of ANDed terms, ignores operators. Safest, but users can't do quoted phrases or OR.
- **`websearch_to_tsquery`** — supports `"quoted phrases"`, `OR`, `-exclude`, matching what a user would expect from a Google-style box.

SoT §18 explicitly rules out Elasticsearch for MVP.

## Decision

Use **`websearch_to_tsquery`** for the user-facing search box. Config must match migration 0009's tsvector trigger, which uses `'simple'` (no stemming) so mixed Bengali+Latin text tokenizes correctly.

## Consequences

- Users get quoted-phrase support and inclusive OR out of the box — matches intuition, no new syntax to teach.
- The `'simple'` config means no English stemming — `road` won't match `roads`. Acceptable; the tender pool has enough repetition that exact tokens land hits.
- Follow-up: if the pool grows and English stemming becomes desirable, we can switch to `'english'` on both the trigger and the query in the same PR (they must stay aligned or search silently returns zero — a bug we hit and fixed in PR #32).

## Trapdoor

The trigger config and the query config **must** match. A prod-only mismatch surfaced in PR #32 — trigger was `'simple'`, query was `'english'`, and users saw silent zero-match. Any future change needs both sides updated in the same commit.
