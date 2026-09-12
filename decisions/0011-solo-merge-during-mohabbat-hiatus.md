# 0011 — Solo-merge exception during Mohabbat's hiatus

**Status:** Accepted 2026-09-12 · Scope-limited (revisit when Mohabbat returns)
**Supersedes for the duration:** `.claude/rules/mew-code/code-rules.md § "Collaborative projects" — no-self-merge`

## Context

TenderSense is registered as a collaborative project (see `Project_Status.md → collaborators`). The workspace-wide rule in `.claude/rules/mew-code/code-rules.md` says every PR requires a review from a named collaborator before merge — and that no session should self-merge. Session 12 (2026-09-12) already invoked a one-time exception to merge four Phase 1 PRs as a handoff cleanup.

As of 2026-09-12 session 19, Mohabbat is fully occupied on another project. Six Phase 1 PRs (#15, #17, #19, #21, #23, #25) plus all upcoming Phase 2 and Phase 3 work would sit indefinitely under the no-self-merge rule. That's not a review discipline outcome — it's a stall.

## Decision

For as long as Mohabbat is unavailable to review, **shawon (founder) may merge his own PRs on this project** without a second reviewer. The change is:

- Scope: TenderSense repo only. Does not extend to any other MewVault project.
- Duration: **Until Mohabbat returns to active review capacity.** Not permanent.
- Reversion: When Mohabbat is back, replace this ADR with a "reinstate no-self-merge" ADR (or add a status change to this one). The workspace-wide rule remains the default; this project is the exception.

## Consequences

**Positive:**
- Phase 1 finalization + Phase 2 + Phase 3 can proceed without waiting on a busy collaborator.
- No throwaway workflow (branch → PR → merge is preserved) — only the reviewer requirement is waived.
- The change is documented as an ADR, so a future session or new collaborator opening the repo cold understands why self-merges are appearing in git history.

**Negative:**
- Loses the second-pair-of-eyes review benefit for the duration. Mitigation: shawon runs a self-review pass on every PR (typecheck, lint, tests, read-the-diff) before merging. CI must be green.
- Slightly weakens the shared-brain discipline. Mitigation: `log.md` + ADRs + `wiki/` continue to be the authoritative shared memory; personal Claude memory does not substitute.

## What still applies

Everything else from the collaborative-project rules stays in force:
- Branch → PR → merge workflow (no direct-to-main commits for code)
- Squash-merge, delete branch after merge (per ADR 0005)
- Every merged PR references its GitHub Issue via `Closes #N`
- CI green required
- No `--no-verify`, no bypassing hooks
- Session wrap continues to log each merge

## Reversion trigger

Mohabbat returns to active review capacity (signalled by his availability update, or by his reappearance on the review queue).
