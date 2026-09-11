# Plan: Phase 1 — Source Ingestion

**Tier:** MewKing
**Status:** Approved 2026-09-11 — execution starting session 6
**Master spec:** `raw/TenderSense_MVP_Source_of_Truth.md` + `raw/TenderSense-SOT-Changes (1).md` (2026-09-09 revision)
**SoT sections:** §10 (external sources), §11 (attribution), §12 (ingestion architecture), §13 (job state), §14 (canonical opportunity schema), §16.12–16.15 (DB tables), §67 (adapter structure), §68–70 (adapter pseudocode + parser resilience)
**Exit criteria (SoT §113):** *"fresh opportunities appear automatically"* — refined per SoT changes to also mean *"a signed-in user can type their company name and see their past e-GP contracts appear."*

---

## 1. Scope

Phase 1 turns TenderSense from an empty auth shell into a system with real procurement data flowing in — and lands the profile-onboarding demo moment.

**In scope**
- Schema: `sources`, `source_records`, `opportunities`, `opportunity_revisions`, `source_sync_runs` (SoT §16.12–16.15 + §13)
- Adapter contract (SoT §67): `ProcurementSourceAdapter`
- **World Bank** cron adapter (SoT §10.1, §68) — JSON API, daily
- **e-GP tender notices** cron adapter (SoT §10.2, §69, reordered per SoT-Changes #1) — HTML + Cheerio, every 4h
- **eExperience on-demand lookup** — NOT a cron adapter. Server action / route handler that queries e-GP's public eExperience surface for a company name and returns a tick-list of past contracts (SoT-Changes #4, own-contracts variant)
- Normalizer: raw payload → `NormalizedOpportunity` (SoT §14)
- Revision detection via content hash comparison (SoT §26)
- **Notice payloads retained** in `source_records.payload` (raw HTML/JSON, SoT-Changes #6) — but big attached tender-document PDFs still not mirrored
- Ingestion runner (walks pages, upserts, records `source_sync_runs`)
- GitHub Actions cron: WB daily, e-GP every 4h
- Idempotency + per-source watermarks in `sources.configuration` jsonb
- Compliance: source URL + "View original notice" affordance (SoT §11)
- Backfill: `npm run backfill:worldbank -- --days=180`; `npm run backfill:egp -- --pages=<n>`
- **PII minimization at ingestion** — see §2.9

**Not in scope for Phase 1 (deferred to Phase 2)**
- **BPPA advertisement pages** (SoT §10.2 Phase A) — e-GP tender pages carry the eligibility data we actually need; BPPA is a secondary discovery-only feed and can wait
- **NOA / eContracts** (who-won-what) — SoT-Changes #4/#8. Awards-of-others data; feeds a Phase 3 "who has won similar work" display, but nothing in Phase 1 or 2 breaks without it
- **APP (Annual Procurement Plans)** — SoT-Changes #5. Forward-looking, additive, the "nobody-can-copy" differentiator; earns a Phase 2 slot of its own
- **Personalized matching / scoring** — Phase 3
- **Assessment engine** — Phase 4
- **Amendment email notifications** — revisions detected + persisted, alerts wait for Phase 6
- **Full-text search UI** — Phase 2
- **Playwright** — HTTP + Cheerio only (SoT §10.2 "Parsing strategy")

## 2. Deliverables

### 2.1 Schema (migrations 0007–0010)

Unchanged from prior draft:
- `0007_sources.sql` — `public.sources` (SoT §16.12); seed rows for `world_bank` and `bd_egp`
- `0008_source_records.sql` — `public.source_records` (SoT §16.13); index on `(source_key, fetched_at desc)`. `payload jsonb` will carry the raw HTML/JSON per SoT-Changes #6
- `0009_opportunities.sql` — `public.opportunities` (SoT §16.14) + recommended indexes (deadline, publication, country, source, status, GIN on search_text/sector/tags)
- `0010_revisions_and_syncs.sql` — `public.opportunity_revisions` (SoT §16.15) + `public.source_sync_runs` (SoT §13)
- Grants: same pattern as migration 0006 — `authenticated` gets SELECT on `opportunities` + `opportunity_revisions` (per SoT §17 exception: normalized opportunities are readable by all authenticated users); nothing on `source_records` or `source_sync_runs`
- RLS: opportunities `for select using (auth.uid() is not null)`. Others locked; server-only via service_role

### 2.2 Adapter layer (`apps/web/lib/ingest/`)

```
apps/web/lib/ingest/
  types.ts                   # ProcurementSourceAdapter interface, SourcePage, SourceHealth, cursor types
  normalizer.ts              # rawRecord → NormalizedOpportunity, content hash
  runner.ts                  # orchestrates fetchPage loop, upsert, revision detection, sync_runs row
  pii.ts                     # redact / hash procuring-entity official contact fields (§2.9)
  adapters/
    worldbank.ts             # WB API adapter
    egp.ts                   # e-GP notices HTML adapter (Cheerio)
  http.ts                    # fetch wrapper with UA header, timeout, backoff
```

### 2.3 On-demand eExperience lookup (`apps/web/lib/experience/`)

Not an ingestion adapter — no cron, no source_records, no watermark, no revision tracking.

```
apps/web/lib/experience/
  egp-experience-client.ts   # single lookupByCompanyName(name) function
  types.ts                   # ExperienceRecord = { contractName, value, currency, awardedAt, certificateNo, procuringEntity }
```

Flow (server action from a new profile-onboarding page):
1. User types company name
2. `lookupByCompanyName(name)` hits the eExperience public URL
3. Returns 0–N records
4. Frontend renders a tick-list ("which of these are yours?")
5. Ticked rows write into `public.projects` (SoT §16.9) with `client_name` = procuring entity, `contract_value` = value, `end_date` = awarded date, plus a new `evidence_credential_number` column for the certificate reference

Migration 0011 adds `evidence_credential_number text` to `public.projects` if not already present. Small, surgical.

### 2.4 Runner semantics (unchanged from prior draft)

Same as before: begin `source_sync_runs` row, loop `fetchPage` until watermark met, upsert `source_records`, compare content hashes, save `opportunity_revisions` when material fields change, update watermark on success only.

### 2.5 World Bank adapter (unchanged)

- Endpoint, pagination, cursor, dedup key, rate limit — all per SoT §10.1 and prior draft.

### 2.6 e-GP notices adapter (was: BPPA — now flipped per SoT-Changes #1)

- Start URL: `https://www.eprocure.gov.bd/resources/common/StdTenderSearch.jsp?h=t` (public search, per SoT §10.2)
- Approach: `fetch` + Cheerio. No login, no browser.
- Extract per SoT §10.2 fields: Tender/Proposal ID, Reference No, Public Status, Procurement Nature, Title, Ministry, Division, Organization, PE Type, Method, Publishing Date and Time, Closing Date and Time
- Additionally: fetch each notice detail page and extract eligibility text (turnover / experience / cash requirements). This is the whole reason e-GP goes first.
- Rate: 1 concurrent request, 3–5s between detail-page requests
- UA: `TenderSenseBot/0.1 (+https://tendersense.app; contact=support@tendersense.app)`
- Cursor: pagination page number
- Dedup key: `BD_EGP:{tender_id}`, fallback sha256(reference_no + organization + closing_date + title)
- Health check: GET root, assert 200 + a known selector present
- If markup drifts (2 consecutive runs missing expected selectors): mark `failed`, log warning, do not partially insert
- Payload kept raw in `source_records.payload` per SoT-Changes #6 for reparsing after selector updates

### 2.7 GitHub Actions cron workflows

- `.github/workflows/sync-worldbank.yml` — daily 02:00 UTC
- `.github/workflows/sync-egp.yml` — every 4h
- `workflow_dispatch: {}` on both for manual re-runs
- Node 22, `npm ci` under `apps/web/`, `npm run sync:<source>`
- Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (source_records writes need service_role since anon/authenticated can't read the table)

### 2.8 Ingestion CLI scripts (`apps/web/scripts/`)

```
apps/web/scripts/
  sync-worldbank.ts          # cron entry
  sync-egp.ts                # cron entry
  backfill-worldbank.ts      # --days=180 default (SoT §10.1 pilot seed)
  backfill-egp.ts            # --pages=N
```

`package.json` scripts:
```
"sync:worldbank": "tsx scripts/sync-worldbank.ts",
"sync:egp": "tsx scripts/sync-egp.ts",
"backfill:worldbank": "tsx scripts/backfill-worldbank.ts",
"backfill:egp": "tsx scripts/backfill-egp.ts"
```

### 2.9 PII minimization at ingestion (new — from SoT-Changes Q3 analysis)

e-GP notice pages carry named procuring-entity officials with direct phone numbers. That is personal data about identifiable people and — even though the source is public — how we store and expose it is our decision, not the source's.

Rules for Phase 1:
- **Store** — full notice HTML/JSON in `source_records.payload` (needed for re-parse after selector drift; keeps the sync loop cheap)
- **Do NOT index in `opportunities` columns** — no `official_name`, `official_phone`, `official_email` fields. If we later want structured access, we'll add opt-in columns with justified purpose.
- **Do NOT display in list views** — the `/opportunities` bonus list shows organization / ministry only, never a named official.
- **Do display on the detail page** for authenticated members only, sourced from the payload at render time. Later phases may audit-log these views.

Later phases (whenever document upload arrives on Pro): revisit this and get counsel input then. Also see §6.7 below.

### 2.10 Tests

- **Unit** — normalizer, hash, adapters mocked at the HTTP layer; runner mocked adapter emitting duplicate + modified record → asserts one revision saved; sync failure mid-loop → run marked failed, watermark unchanged
- **Integration** — extend `tests/integration/`; real local Supabase, real HTTP mocked with `msw` or `nock`; adapter → runner → DB → assert row counts + revision row
- No live-API calls in CI. Manual smoke: `scripts/smoke-worldbank.ts` and `scripts/smoke-egp.ts`

## 3. Decisions to record as ADRs

- `0006-sot-2026-09-09-scope.md` — captures the SoT revision itself: adapter re-ordering, MVP scope reductions (individual profiles hidden, team/reports gutted), grade vocabulary, PII stance
- `0007-ingest-runner-pattern.md` — runner-as-orchestrator vs adapter-owns-run
- `0008-content-hash-scope.md` — which fields feed `content_hash`
- `0009-cron-infrastructure.md` — GitHub Actions vs pg_cron vs Supabase Scheduled Functions
- `0010-eexperience-on-demand.md` — why eExperience is a lookup, not a cron adapter

## 4. TDD gate

Same as Phase 0. Test-first for every file under `lib/ingest/` and `lib/experience/`. Integration tests before wiring cron workflows.

## 5. Sequencing (roughly one PR each)

1. **PR — SoT-Changes incorporation:** ADR 0006, `/workspaces/new` hides `individual`, MASTER_SPEC + Project_Status updated. **This PR — landing now.**
2. **PR — schema:** migrations 0007–0010 (+ 0011 for `projects.evidence_credential_number`), grants, RLS. Local + hosted push. No app code.
3. **PR — adapter contract + normalizer + PII helper:** `types.ts`, `normalizer.ts`, `pii.ts`, `http.ts`. Unit tests + fixtures.
4. **PR — World Bank adapter + backfill:** WB adapter, `sync-worldbank.ts`, backfill.
5. **PR — Runner + revision detection:** integration test end-to-end via a mock adapter.
6. **PR — e-GP notices adapter:** e-GP adapter + `sync-egp.ts`. Careful selectors, live-source smoke script.
7. **PR — Cron workflows:** two GH Actions files; workflow_dispatch verified in Actions UI.
8. **PR — eExperience lookup + profile-onboarding UI:** `lib/experience/`, server action, new page or form on the workspace profile view. Live-source smoke.
9. **PR — Bonus `/opportunities` list** (optional — see §6.5).
10. **PR — Docs + remaining ADRs 0007–0010 + tag `v0.2.0-phase1`.**

## 6. Open questions

Some of these carried over from the original draft; others are new after the SoT revision.

1. **HTTP client.** Native `fetch` for WB (JSON). e-GP wants retry + backoff + concurrency limits — recommend adding `undici`'s Agent explicitly. Confirm?
2. **Cron infra.** GitHub Actions ubuntu-latest, ~30–90s per run, well within free 2000 min/mo. Alternative: external cron (Upstash / cron-job.org) → Route Handler. Recommend GHA for MVP.
3. **Watermark storage.** `sources.configuration` jsonb. Flexible but schema-less. Recommend jsonb.
4. **Backfill window default.** WB 180 days (SoT §10.1); e-GP 30 days initially (fewer pages, tighter iteration).
5. **Bonus `/opportunities` list.** Read-only, no filters, no search — just prove data flows. Recommend **yes** at tail of Phase 1; ~1 day of work; helps BRAC IT *see* the value before matching lands.
6. **Timezone default.** Naive source dates → assume UTC. Display formatted `Asia/Dhaka`. Confirm?
7. **PII redaction rule.** §2.9 above proposes: store raw in payload, don't index in structured columns, display in detail view only. This is the entire Phase 1 stance on procuring-entity officials. Confirm the position before the e-GP adapter is written?
8. **eExperience selectors.** e-GP's eExperience surface exact URL + markup — I don't have it in the SoT and the SoT-Changes doc doesn't name it. Someone (you, teammate, or me via manual browsing) needs to visit and note the URL + selectors before adapter work starts. This is a **manual reconnaissance task**, not a code task.
9. **Rate-limit courtesy.** e-GP is a government service. 3–5s between detail requests is my proposal (SoT §10.2). Confirm before we point crawlers at production. If they publish a stricter policy, follow that.
10. **eExperience lookup quotas.** On-demand lookup means a signed-in user can hammer it. Add a per-workspace daily cap (e.g. 20 lookups/day/workspace) to keep good faith with the source?

## 7. Exit checklist

- [ ] Migrations 0007–0011 applied to local + hosted
- [ ] World Bank sync populates `opportunities` from ~180 days of history
- [ ] e-GP sync populates opportunities + notice payloads retained in `source_records.payload`
- [ ] Both cron workflows visible + successful (green) in GitHub Actions
- [ ] `source_sync_runs` shows one row per run with counts
- [ ] Revision test: manually mutate a source_record content_hash → next sync produces an `opportunity_revisions` row
- [ ] Integration test: adapter → runner → DB → revision — passing in `npm run test:integration`
- [ ] eExperience lookup works end-to-end for at least one known company (a company one of us has actually bid as, so we can verify the returned rows are real)
- [ ] `/workspaces/new` no longer shows the `individual` radio option
- [ ] ADRs 0006–0010 committed
- [ ] `Project_Status.md` updated: `current_phase: "Phase 2 — Discovery + BPPA/APP/NOA adapters (planning)"`
- [ ] Tag `v0.2.0-phase1`

## 8. Rough size

**Two weeks solo pace, faster with the teammate.** The eExperience lookup is much smaller than a cron adapter (no source_records write, no revision tracking, no scheduler) so it doesn't stretch the phase. The lift-off risk is e-GP HTML markup — mitigate with (a) raw payload retention for re-parse without re-crawl, (b) auto-disable on 2 consecutive selector failures.

The prior "3–4 week" estimate assumed a full crawl-and-store adapter for eExperience. Splitting Awards into three surfaces (per SoT-Changes Q1 refinement) and treating eExperience as on-demand puts the phase back at ~2 weeks.
