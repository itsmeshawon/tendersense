# ADR 0005 — Git workflow: feature branch + PR + squash-merge

**Status:** Accepted · **Date:** 2026-09-11 · **Phase:** 0

## Context

The initial scaffold (through session 1) landed directly on `main`. Sessions 2–3 added two teammates as repo collaborators, changing the working model from solo to small-team. Without an explicit workflow, patterns diverge and `main` history becomes an unreadable stream of tiny commits.

## Decision

For all non-trivial changes:

1. Branch off `main` — `<type>/<slug>` naming:
   - `feat/` for new features
   - `fix/` for bug fixes
   - `chore/` for build, deps, tooling
   - `docs/` for docs and ADRs
   - `test/` for test-only changes
2. Commit freely on the branch; commit messages can be terse (they'll be squashed).
3. Push and open a PR to `main` with `gh pr create` or the web UI. PR title uses the same `<type>: <summary>` shape as commits; PR body includes a Summary + Test Plan.
4. Wait for CI green (`.github/workflows/ci.yml`: typecheck + lint + tests + build).
5. **Squash-merge** into `main`. `main` ends up with one commit per feature slice, clean history. Branch is deleted (auto via `gh pr merge --squash --delete-branch`).

### Exception — direct-to-`main` allowed for

- Typo fixes in docs / comments
- One-line copy fixes in UI
- Wrap commits (`Project_Status.md`, `log.md`)
- Hotfixes to a *clean* CI when green cannot wait for a PR round-trip

Direct-to-`main` requires CI to still be green; if a direct commit reds CI, the fix goes back through a PR.

## Consequences

- Every non-trivial change gets a CI run before landing on `main`, catching lint/type/test regressions early. Session 2's PR #1 caught an apostrophe-in-JSX regression before merge — vindicates the pattern.
- Teammates can review async without racing conflicts.
- `main` history is scannable — one commit per feature, prefixed with `<type>(<scope>):`.
- Squash-merge trades the granular branch history for a clean linear main. The full branch history stays in the PR itself if anyone needs to spelunk.

## Alternatives considered

- **Trunk-based (direct-to-main for everything).** Works solo, breaks the moment two people push simultaneously.
- **Merge commits (no squash).** Rejected — noisy history, hard to bisect.
- **Rebase-merge.** Rejected — rebasing shared branches confuses collaborators; squash is more predictable.
- **Long-lived branches (git-flow style).** Rejected — over-engineered for a single-`main`-branch product with no release train yet.

## Enforcement

Convention only, not GitHub branch protection rules — yet. Once the team is 3+ committers, revisit and add:
- Require PR review from at least 1 non-author.
- Require CI to pass before merge.
- Disallow force-pushes to `main`.
