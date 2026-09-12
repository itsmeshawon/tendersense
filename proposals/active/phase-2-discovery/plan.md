# Plan: Phase 2 — Discovery

**Tier:** MewKing
**Status:** Draft — awaiting approval after Phase 1 tags `v0.2.0-phase1`
**Master spec:** `raw/TenderSense_MVP_Source_of_Truth.md` + `raw/TenderSense-SOT-Changes (1).md`
**SoT sections:** §6 IA (Discover branch), §16.16 monitoring_profiles, §16.17 saved_searches, §18 search, §26 amendments, §37 monitoring APIs
**Exit criteria (SoT §113):** *"user can reliably find opportunities"*

---

## 1. Scope

Phase 1 got data flowing. Phase 2 makes it findable. Users move from "50 mixed rows" to "the 8 opportunities that match my monitoring profile, sorted by deadline urgency."

**In scope:**

- **BPPA advertisements adapter** — public advertisement pages (SoT §10.2 originally Phase A, deferred to Phase 2 per ADR 0006 §1)
- **NOA / eContracts adapter** — who-won-what public data (SoT-Changes #8)
- **APP adapter** — Annual Procurement Plans (SoT-Changes #5, the "nobody-can-copy" differentiator)
- **`monitoring_profiles` table + CRUD UI** — SoT §16.16; per-workspace saved filter sets that drive alerts
- **`saved_searches` table + CRUD UI** — SoT §16.17; snapshot of a filter combination the user names
- **Full-text search** on `/opportunities` — GIN index already exists in migration 0009 (`search_text` tsvector); wire the input + query
- **Sort options** on `/opportunities` — deadline / value / relevance
- **Amendment badges** on `/opportunities` — surfacing `opportunity_revisions` count per row
- **"Recent amendments" pane on `/dashboard`** — SoT §6 Home IA
- **Free plan monitoring cap** — SoT §16.16 says free = 1 active profile, Pro = many; enforce server-side

**Not in scope for Phase 2 (moved to later phases):**

- Personalized ranking / grade / decision — Phase 3
- Assessment / eligibility — Phase 4
- Team-scoped shortlist — Phase 5 (gutted for MVP)
- Amendment email digest — Phase 6

## 2. Deliverables

### 2.1 Schema (migrations 0012–0015)

- `0012_monitoring_profiles.sql` — full table per SoT §16.16. RLS via `is_workspace_member`.
- `0013_saved_searches.sql` — SoT §16.17. RLS via `is_workspace_member`.
- `0014_notifications.sql` — SoT §16.27. In-app notifications for amendments, feeds the dashboard pane. RLS: user reads their own.
- `0015_indexes.sql` — extra indexes if search / sort profile flags them needed. Placeholder — probably not needed since 0009 already added GIN on `search_text`.

### 2.2 Ingestion additions

- `lib/ingest/adapters/bppa.ts` — HTML adapter for BPPA advertisement search (SoT §10.2)
- `lib/ingest/adapters/egp-noa.ts` — who-won-what awarded contracts (needs recon; different from eExperience)
- `lib/ingest/adapters/egp-app.ts` — Annual Procurement Plans (needs recon)
- Cron workflows for each in `.github/workflows/`

### 2.3 Discovery UI

- **`/opportunities` upgrades:**
  - Text search input (uses `search_text` tsvector `plainto_tsquery`)
  - Sort dropdown: publication date desc (default) / deadline asc / value desc / relevance (only when search query is set)
  - "Days remaining" tag colorized (red < 7 days, yellow < 14, green otherwise)
  - Amendment badge per row when `opportunity_revisions.count > 0`
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
- **Live smoke** — new adapter runs pushed to hosted, `/opportunities` filtered by profile shows real matches

## 3. Decisions to record as ADRs

- `0011-monitoring-profile-match-algorithm.md` — profile matching is a deterministic AND across filters (country ∈ profile.countries AND source ∈ profile.sources AND …). Not fuzzy. Fuzzy matching is Phase 3.
- `0012-search-text-approach.md` — Postgres FTS with weighted `tsvector`. No Elasticsearch (SoT §18 explicitly rules it out for MVP).
- `0013-noa-app-adapter-shape.md` — do NOA + APP feed `opportunities` (dubious — they aren't tender notices) or separate tables? Recommendation: separate tables `awards` + `procurement_plans`, with cross-links to opportunities where possible.
- `0014-amendment-badge-source.md` — which fields count as amendments per SoT §26 (already codified in ADR 0008 for the runner; may need extension for user-facing severity).

## 4. TDD gate

Same as Phase 1. `lib/` files get tests first.

## 5. Sequencing (roughly one PR per bullet)

1. **PR — schema (0012–0015):** monitoring_profiles, saved_searches, notifications
2. **PR — search + sort on /opportunities:** wire `search_text` + sort dropdown, no new schema
3. **PR — monitoring profiles UI + Free-plan gate:** `/monitoring` route + create/edit form
4. **PR — saved searches UI:** `/saved-searches` route + snapshot save/load
5. **PR — amendment badges + /dashboard hub:** revive `/dashboard` from redirect to real hub
6. **PR — notifications:** bell + `/notifications` + runner integration
7. **PR — BPPA adapter (recon first)**
8. **PR — NOA adapter (recon first)**
9. **PR — APP adapter (recon first)**
10. **PR — cron workflows for BPPA/NOA/APP + tag `v0.3.0-phase2`**

## 6. Open questions (need answers before approval)

1. **NOA + APP normalize into `opportunities` or into new tables?** Per ADR 0013 draft — recommend separate `awards` + `procurement_plans` tables. Consequences: separate list pages, separate filters. Confirm.
2. **Monitoring profile match evaluation — server-side query or in-app?** For a small pilot, run it as a query on `/opportunities` load. Later, materialize a per-workspace ranked view.
3. **Full-text query dialect** — `plainto_tsquery` (safe, no operators) or `websearch_to_tsquery` (supports "quoted phrases" and OR). Recommend `websearch_to_tsquery` for user-facing search.
4. **Amendment badge severity levels** — SoT §26 has "critical change" list; do we distinguish critical amendments visually? Recommend yes: red badge for deadline changes, gray for other material changes.
5. **Notification decay** — how long do amendment notifications stay in the bell? Recommend 30 days, auto-hide but keep in `/notifications` list.
6. **Free-plan gate wording** — when the second profile is rejected, what does the UI say? Draft: "Free plan supports one active monitoring profile. Upgrade to Pro for unlimited."

## 7. Exit checklist

- [ ] Migrations 0012–0015 applied to local + hosted
- [ ] `/opportunities` supports text search + sort options
- [ ] Users can create + edit monitoring profiles; free plan gate enforced
- [ ] Saved searches work end-to-end
- [ ] Amendment badges appear on `/opportunities` list
- [ ] `/dashboard` renders "Recent amendments" + "Upcoming deadlines from your profiles"
- [ ] Notifications bell + `/notifications` route live
- [ ] BPPA + NOA + APP adapters shipped (with cron)
- [ ] ADRs 0011–0014 committed
- [ ] `Project_Status.md` current_phase: "Phase 3 — Matching (planning)"
- [ ] Tag `v0.3.0-phase2`

## 8. Rough size

**3–5 weeks solo pace, faster with the teammate.** BPPA + NOA + APP adapters absorb roughly a third of the time (each with its own recon session and edge-case handling). Monitoring profiles + saved searches + FTS + amendments are UI-heavy but structurally straightforward.

Blocker risk: **APP adapter data shape** — the SoT §10.2 doesn't detail this surface, and it's a newer government publishing habit. Its recon might reveal it's PDFs (not HTML), which would require pdf-text extraction — SoT §65 mentions this but says "extract text only when needed." First priority in Phase 2 recon: what format does APP publish in?
