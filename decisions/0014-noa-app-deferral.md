# 0014 — NOA and APP adapters deferred out of Phase 2

**Status:** Accepted 2026-09-12
**Phase:** 2 (Discovery) v2 §1a

## Context

The original Phase 2 plan included two additional Bangladesh procurement feeds:

- **NOA / eContracts** — Notification-of-Award records ("who won what") from the e-GP awarded-contracts surface.
- **APP** — Annual Procurement Plans, publishing what agencies expect to procure in the coming fiscal year.

Both were sequenced as PRs 8 and 9 of a 10-PR Phase 2. During plan review (session 19), we cut both.

## Decision

**Cut NOA and APP from Phase 2. Ship BPPA only as the third BD feed.**

Rationale:

1. **Neither serves the Phase 2 exit criterion.** SoT §113 for Phase 2 is *"user can reliably find opportunities."* NOA is retrospective ("who won") and APP is prospective ("what's planned"). Neither is a *live* tender the user can act on today — which is what `/opportunities` renders.

2. **APP has an unquantified recon blocker.** SoT §65 flagged that APP may be published as PDFs, requiring pdf-text extraction. Taking on new-format work during the phase whose job is "make finding fast" is the wrong risk profile.

3. **Phase 3 (Matching) is where the product becomes tender-*sensing*.** Every week spent on speculative context feeds is a week matching isn't shipping — and matching is the pilot-conversion moment.

## Consequences

**Preserved for future work:**

- When re-planned, land NOA and APP into **separate tables** (`awards`, `procurement_plans`) rather than polluting `opportunities`. They aren't tenders and shouldn't be treated as such by the matching engine or the /opportunities feed.
- Cross-link them to `opportunities` by reference number where possible (a shared `bd_egp` tender may have both a live notice and a later award).

**Trigger for revisiting:**

- Pilot converts and BRAC IT (or a follow-on customer) asks for "market intelligence" features.
- Or Phase 6 (Alerts / Reporting) scoping surfaces user demand for who-won-what analytics.

## What we shipped instead

BPPA advertisement adapter (`bd_bppa` source) — same shape as e-GP notices but with GET-linkable detail URLs. Shipped in Phase 2 PR #7 (2026-09-12).
