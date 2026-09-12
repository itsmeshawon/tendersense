# 0025 — 6-dimension scoring rebalance: credential signal restored

**Status:** Accepted 2026-09-13
**Phase:** 4 (Assessment) v2 §2h
**Bumps:** `SCORING_VERSION 1 → 2`

## Context

Phase 3 deferred the `credential` signal (ADR 0016) because there was no workspace-side credential store. Phase 4 fixes that: `workspace_credentials` (migration 0022) is now populated, and the assessment engine already emits normalized keys (`iso_27001`, `cmmi_dev`, …) for both required certifications and workspace-held credentials. Ready to restore.

## Decision

Add `credential` as the 6th scoring dimension. New weight distribution:

| Dimension | Weight |
|---|---|
| capability | 33 |
| sector | 18 |
| keyword | 18 |
| past_project | 14 |
| country | 10 |
| **credential** | **7** |
| **Total** | **100** |

- `credentialSignal` runs the assessment rules extractor over the opportunity text to identify required certifications, then checks overlap with the workspace's `credentialKeys` (derived from valid rows in `workspace_credentials`).
- **Applicable = false** when the notice lists no specific certifications (redistributes weight per Phase 3 ambiguity rule).
- **Full contribution** on any overlap; **zero + concern** on missing.
- `SCORING_VERSION` bumps to 2. Every existing match row is recomputed via the standard `recomputeForWorkspace` path.

## Consequences

- Small weight, high signal: 7 points is enough to nudge grade boundaries when it matters (a workspace with ISO 27001 credited on a security tender) without dominating.
- Rules-extractor and matching engine now share the certification-key vocabulary. A new pattern (say `soc2_type2`) added to the extractor immediately participates in scoring.
- Workspaces without any credentials on file see the credential signal turn into a concern chip ("Opportunity asks for ISO 27001; workspace has no credentials on file"), which is a discoverability nudge toward completing the profile.
