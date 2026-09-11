# Project: tendersense — Code

Stack: next + typescript + supabase + vercel + github
Started: 2026-09-11
Collaborative: yes (see `Project_Status.md` collaborators list). Follow the collaborative-project rules in `.claude/rules/mew-common/vault-rules.md` and `.claude/rules/mew-code/code-rules.md` — `git pull` first, GitHub Issues before Stalk/MewKing work, never self-merge PRs.

## What to read first

1. `Project_Status.md` — current focus, open questions
2. `proposals/active/` — any in-flight MewKing features (check `status.yaml`)
3. `decisions/` — prior architectural decisions
4. `docs/ux/` — promoted UX artifacts (if from a design-studio project)

## The Court

Use `/plan <feature>` — Claude proposes Pounce / Stalk / MewKing.
Plan approval gate is at MewKing → Plan stage. Nothing proceeds without sign-off.

## API contract

Document at project root:
- HTTP → `openapi.yaml`
- GraphQL → `schema.graphql`
- CLI → `README.md` Commands section

Update contract at MewKing Finalize stage.
