# Plan: Phase 2 — Discovery

**Tier:** MewKing
**Status:** APPROVED v2 (2026-09-12) — NOA + APP cut; all open questions resolved. Execution starts after Phase 1 tags `v0.2.0-phase1`.
**Master spec:** `raw/TenderSense_MVP_Source_of_Truth.md` + `raw/TenderSense-SOT-Changes (1).md`
**SoT sections:** §6 IA (Discover branch), §16.16 monitoring_profiles, §16.17 saved_searches, §18 search, §26 amendments, §37 monitoring APIs
**Exit criteria (SoT §113):** *"user can reliably find opportunities"*

---

## 1. Scope

Phase 1 got data flowing. Phase 2 makes it findable. Users move from "50 mixed rows" to "the 8 opportunities that match my monitoring profile, sorted by deadline urgency."

**In scope:**

- **BPPA advertisements adapter** — public advertisement pages (SoT §10.2 originally Phase A, deferred to Phase 2 per ADR 0006 §1). Same structural shape as e-GP notices; cheap to add; doubles BD coverage in the pilot pitch.
- **`monitoring_profiles` table + CRUD UI** — SoT §16.16; per-workspace saved filter sets that drive alerts
- **`saved_searches` table + CRUD UI** — SoT §16.17; snapshot of a filter combination the user names
- **Full-text search** on `/opportunities` — GIN index already exists in migration 0009 (`search_text` tsvector); wire the input + query using `websearch_to_tsquery` (supports quoted phrases + OR, matches user intuition)
- **Sort options** on `/opportunities` — deadline / value / relevance
- **Amendment badges** on `/opportunities` — surfacing `opportunity_revisions` count per row. Red badge reserved for deadline changes only; other material changes get a gray badge (don't dilute severity).
- **"Recent amendments" pane on `/dashboard`** — SoT §6 Home IA
- **Free plan monitoring cap** — SoT §16.16 says free = 1 active profile, Pro = many; enforce server-side

**Cut from Phase 2 (moved out — see §1a):**

- **NOA / eContracts adapter** (originally SoT-Changes #8) — deferred
- **APP adapter** (originally SoT-Changes #5) — deferred

**Not in scope for Phase 2 (moved to later phases, unchanged):**

- Personalized ranking / grade / decision — Phase 3
- Assessment / eligibility — Phase 4
- Team-scoped shortlist — Phase 5 (gutted for MVP)
- Amendment email digest — Phase 6

### 1a. Why NOA + APP are cut

Both were originally sequenced as PRs 8 + 9 of 10, absorbing roughly a third of Phase 2's time. Removing them and shipping Phase 3 sooner is a better trade for three reasons:

1. **Neither serves the Phase 2 exit criterion.** SoT §113 says *"user can reliably find opportunities"* — NOA is who-won-what (retrospective context) and APP is annual procurement plans (forward-looking research, not a live tender). What BRAC IT opens the app to see is *current tenders that match them*. That's BPPA + FTS + monitoring profiles + (Phase 3) matching.
2. **APP has an unquantified blocker.** §8 originally flagged the format may be PDFs — pdf-text extraction (SoT §65) is real work with unknown scope, taken on during the phase whose job is "make finding fast." Wrong risk profile.
3. **Phase 3 is where the product becomes tender-*sensing*.** The grade + reasons UI is the pilot's aha moment. Every week spent on speculative context feeds is a week matching isn't shipping.

**Where they go instead:** a later phase after MVP proves out (or Phase 6 alerts/reporting, since NOA/APP are more "market intelligence" than discovery). Recon budget assigned there, not stolen from Phase 2.

## 2. Deliverables

### 2.1 Schema (migrations 0012–0015)

- `0012_monitoring_profiles.sql` — full table per SoT §16.16. RLS via `is_workspace_member`.
- `0013_saved_searches.sql` — SoT §16.17. RLS via `is_workspace_member`.
- `0014_notifications.sql` — SoT §16.27. In-app notifications for amendments, feeds the dashboard pane. RLS: user reads their own.
- `0015_indexes.sql` — extra indexes if search / sort profile flags them needed. Placeholder — probably not needed since 0009 already added GIN on `search_text`.

### 2.2 Ingestion additions

- `lib/ingest/adapters/bppa.ts` — HTML adapter for BPPA advertisement search (SoT §10.2)
- Cron workflow in `.github/workflows/sync-bppa.yml`

### 2.3 Discovery UI

- **`/opportunities` upgrades:**
  - Text search input (uses `search_text` tsvector via `websearch_to_tsquery`)
  - Sort dropdown: publication date desc (default) / deadline asc / value desc / relevance (only when search query is set)
  - "Days remaining" tag colorized (red < 7 days, yellow < 14, green otherwise)
  - Amendment badge per row when `opportunity_revisions.count > 0` — **red badge for deadline changes**, gray badge for other material changes
- **`/monitoring` — monitoring profiles UI:**
  - List of profiles for the current workspace
  - Create/edit form: name + countries + sources + sectors + keywords + excluded_keywords + min/max value + min_days_remaining
  - Free plan enforcement: reject 2nd active profile in the RPC
  - "Preview" button that runs the profile against current opportunities to show what it would surface
- **`/saved-searches` — saved-search snapshots:**
  - Simpler than monitoring: capture a URL-param set + a name; render as clickable links back to `/opportunities`

### 2.4 Notifications + dashboard pane

- Runner (from Phase 1) already writes `opportunity_revisions` on content_hash changes.
- **Add:** after writing a revision, insert notifications for workspaces where the opportunity is shortlisted (Phase 3) OR matches an active monitoring profile.
- **`/dashboard` route:** replace redirect logic with a real hub. Sections:
  - Recent amendments (last 7 days)
  - Upcoming deadlines from your monitoring profiles
  - Assessment usage (placeholder for Phase 4)
- Notification bell in header + `/notifications` list page

### 2.5 Tests

- **Unit** — repository/service tests for monitoring profiles, saved searches, search-and-sort variants (same fake-client pattern as `lib/opportunities/repository.test.ts`)
- **Integration** — extend `tests/integration/` with a monitoring-profile match test: create profile with `country_code = BD`, insert opportunity that matches, insert one that doesn't, assert only the match surfaces
- **Live smoke** — BPPA adapter run pushed to hosted, `/opportunities` filtered by profile shows real matches

## 3. Decisions to record as ADRs

- `0011-monitoring-profile-match-algorithm.md` — profile matching is a deterministic AND across filters (country ∈ profile.countries AND source ∈ profile.sources AND …). Not fuzzy. Fuzzy matching is Phase 3.
- `0012-search-text-approach.md` — Postgres FTS with weighted `tsvector`, `websearch_to_tsquery` for user input. No Elasticsearch (SoT §18 explicitly rules it out for MVP).
- `0013-amendment-badge-severity.md` — red badge = deadline change only (per SoT §26 critical-change list); gray badge = other material changes. Keeps red meaningful.
- `0014-nooa-app-deferral.md` — NOA + APP moved out of Phase 2 with rationale in §1a. When re-planned, land in separate `awards` + `procurement_plans` tables (not `opportunities`) with cross-links.

## 4. TDD gate

Same as Phase 1. `lib/` files get tests first.

## 5. Sequencing (roughly one PR per bullet)

1. **PR — schema (0012–0015):** monitoring_profiles, saved_searches, notifications
2. **PR — search + sort on /opportunities:** wire `search_text` + sort dropdown, no new schema
3. **PR — monitoring profiles UI + Free-plan gate:** `/monitoring` route + create/edit form
4. **PR — saved searches UI:** `/saved-searches` route + snapshot save/load
5. **PR — amendment badges + /dashboard hub:** revive `/dashboard` from redirect to real hub; deadline-change red badge
6. **PR — notifications:** bell + `/notifications` + runner integration
7. **PR — BPPA adapter (recon first)** + cron workflow
8. **Tag `v0.3.0-phase2`**

## 6. Decisions (all questions resolved 2026-09-12)

1. ~~**NOA + APP normalize into `opportunities` or into new tables?**~~ Moot — both cut from Phase 2. When re-planned: separate `awards` + `procurement_plans` tables (ADR 0014).
2. **Monitoring profile match evaluation** — **server-side query on `/opportunities` load**. Postgres GIN handles 5-way AND in single-digit ms at pilot volume. If we ever hit 100k opps/workspace, promote to a materialized ranked view — problem-driven, not preventive.
3. ~~**Full-text query dialect**~~ **`websearch_to_tsquery`** (ADR 0012).
4. ~~**Amendment badge severity**~~ **Red = deadline change only, gray = other material changes** (ADR 0013).
5. **Notification decay** — **30 days in the bell, permanent in `/notifications`**. Bell = "what needs your attention now"; full list = audit history.
6. **Free-plan gate wording** — **"Free plan supports one active monitoring profile. Deactivate the existing profile, or upgrade to Pro for unlimited."** Offers an in-plan action (deactivate) as well as the upgrade path.

## 7. Exit checklist

- [ ] Migrations 0012–0015 applied to local + hosted
- [ ] `/opportunities` supports text search (`websearch_to_tsquery`) + sort options
- [ ] Users can create + edit monitoring profiles; free plan gate enforced
- [ ] Saved searches work end-to-end
- [ ] Amendment badges appear on `/opportunities` list (red = deadline change, gray = other)
- [ ] `/dashboard` renders "Recent amendments" + "Upcoming deadlines from your profiles"
- [ ] Notifications bell + `/notifications` route live
- [ ] BPPA adapter shipped (with cron)
- [ ] ADRs 0011–0014 committed
- [ ] `Project_Status.md` current_phase: "Phase 3 — Matching (planning)"
- [ ] Tag `v0.3.0-phase2`

## 8. Rough size

**~3 weeks solo pace, faster with the teammate** (down from 3–5 weeks in v1). BPPA absorbs ~4–5 days including recon. Monitoring profiles + saved searches + FTS + amendments + notifications are UI-heavy but structurally straightforward — that's the bulk of the phase.

Blocker risk is now low: BPPA is HTML like e-GP notices, and the runner + adapter contract is already proven. NOA + APP's blockers (unknown APP format, awards-vs-tenders schema question) are deferred with the adapters, not carried into this phase.
