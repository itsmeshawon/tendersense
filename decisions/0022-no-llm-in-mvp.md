# 0022 — No LLM in Phase 4 MVP: rules extractor + manual entry

**Status:** Accepted 2026-09-13
**Phase:** 4 (Assessment) v2 §2d

## Context

The original Phase 4 sketch assumed Claude/GPT would extract requirements from tender text. That's a recurring per-assessment cost, opaque outputs, and a new failure mode (provider outage → assessment fails). For a pilot with one paying customer running maybe 20 assessments a week, the cost/complexity is not justified.

## Decision

Ship MVP with two deterministic subsystems, both free to operate:

- **`lib/assessment/rulesExtractor.ts`** — hand-authored pattern library (regex + light tokenization). ~10 patterns at launch covering ISO/CMMI certifications, min-years experience, similar-projects thresholds, sector coverage, annual turnover, audited financials, geography, and submission mechanics.
- **`lib/assessment/actions.ts::addRequirementAction`** — server action for adding/editing/removing requirements. Workspace admin curates anything the rules miss. First manual add promotes `extraction_method` from `rules` to `mixed`.

Expected recall: 60–70% on structured WB / e-GP / BPPA notices; lower on unstructured PDFs (deferred to Phase 4.5 per §2g). Precision high — rules don't hallucinate.

**LLM as a Phase 4.5 / 5 follow-up:** if the pilot demands richer extraction, add an "Auto-fill from source" button that calls Claude/GPT once per assessment, cached forever, quota-gated, opt-in per workspace. Not now.

## Consequences

- Zero external-provider cost through pilot.
- Extractor is auditable: `patternId` on every extracted requirement points at the exact rule that fired.
- Pattern-library expansion drives future recall gains — the pilot review (PR #12) documents where manual entry filled gaps, feeding the next release.
- No async execution path for the assessment run itself — rules are fast enough to run synchronously in the server action (see ADR 0023 for the async pattern retained for other job types).
