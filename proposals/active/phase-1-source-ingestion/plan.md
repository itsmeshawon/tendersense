# Plan: Phase 1 — Source Ingestion

**Tier:** MewKing
**Status:** Drafting → awaiting approval
**Master spec:** `raw/TenderSense_MVP_Source_of_Truth.md`
**SoT sections:** §10 (external sources), §11 (attribution), §12 (ingestion architecture), §13 (ingestion job state), §14 (canonical opportunity schema), §16.12–16.15 (DB tables), §67 (adapter structure), §68–70 (adapter pseudocode + parser resilience)
**Exit criteria (SoT §113):** *"fresh opportunities appear automatically"*

---

## 1. Scope

Phase 1 turns TenderSense from an empty auth shell into a system with real procurement data flowing in. Two source adapters, one ingestion pipeline, cron-driven, with revision detection for amendments.

**In scope**
- Schema: `sources`, `source_records`, `opportunities`, `opportunity_revisions`, `source_sync_runs` (SoT §16.12–16.15 + §13)
- Adapter contract (SoT §67): `ProcurementSourceAdapter` interface with `fetchPage`, `normalize`, `healthCheck` (+ optional `fetchDetails`)
- World Bank adapter (SoT §10.1, §68)
- BPPA public advertisements adapter (SoT §10.2 Phase A, §69), Cheerio-based
- Normalizer: raw payload → `NormalizedOpportunity` (SoT §14)
- Revision detection via content hash comparison (SoT §26)
- Ingestion runner: takes an adapter, walks pages, upserts source_records + opportunities, records a `source_sync_runs` row
- GitHub Actions cron workflow: World Bank daily, BPPA every 4h
- Idempotency + watermark: each source has `last_successful_sync_at` and a per-adapter cursor
- Source-record integrity: `unique(source_key, external_id)` enforced
- Compliance: every opportunity retains `source_url`, `source_updated_at`, "View original notice" affordance (SoT §11)
- Backfill script: `npm run backfill:worldbank -- --days=180` for the initial seed window

**Not in scope for Phase 1**
- Personalized matching / scoring (Phase 3)
- Assessment engine (Phase 4)
- Amendment email notifications — revisions detected + persisted, but user alerts wait for Phase 6
- e-GP scraping (SoT §10.2 Phase B) — BPPA public listing is enough for the pilot
- Full-text search UI (Phase 2)
- Playwright / browser rendering — HTTP + Cheerio only (SoT §10.2 "Parsing strategy")

## 2. Deliverables

### 2.1 Schema (migrations 0007–0010)

- `0007_sources.sql` — `public.sources` (SoT §16.12); seed rows for `world_bank` and `bd_egp_bppa`
- `0008_source_records.sql` — `public.source_records` (SoT §16.13); index on `(source_key, fetched_at desc)`
- `0009_opportunities.sql` — `public.opportunities` (SoT §16.14) + all recommended indexes (deadline, publication, country, source, status, GIN on search_text/sector/tags)
- `0010_revisions_and_syncs.sql` — `public.opportunity_revisions` (SoT §16.15) + `public.source_sync_runs` (SoT §13)
- Grants: same pattern as migration 0006 — `authenticated` gets SELECT on opportunities + revisions; nothing on source_records or sync_runs (server-only reads via service_role)
- RLS: opportunities table gets `select using (true)` for authenticated (SoT §17 exception: public normalized opportunities are readable by all authenticated users). Revisions same. Others locked.

### 2.2 Adapter layer (`apps/web/lib/ingest/`)

```
apps/web/lib/ingest/
  types.ts                   # ProcurementSourceAdapter interface, SourcePage, SourceHealth, cursor types
  normalizer.ts              # rawRecord → NormalizedOpportunity, content hash
  runner.ts                  # orchestrates fetchPage loop, upsert, revision detection, sync_runs row
  adapters/
    worldbank.ts             # WB API adapter
    bppa.ts                  # BPPA HTML adapter (Cheerio)
  http.ts                    # thin fetch wrapper with UA header, timeout, backoff
```

Adapter contract (from SoT §67):
```ts
interface ProcurementSourceAdapter {
  sourceKey: string;
  fetchPage(cursor?: SourceCursor): Promise<SourcePage>;
  normalize(record: unknown): Promise<NormalizedOpportunity>;
  fetchDetails?(record: SourceRecord): Promise<SourceDetail>;
  healthCheck(): Promise<SourceHealth>;
}
```

### 2.3 Runner semantics

For each cron tick:
1. Insert `source_sync_runs` row with `status='running'`, capture `started_at`.
2. Load the source's `last_successful_sync_at` and adapter cursor from `sources.configuration`.
3. Loop `fetchPage` until: page is short, or all records older than the watermark, or a max-page-count safety cap.
4. For each record:
   - Compute `content_hash` from the normalized fields.
   - Upsert `source_records` by `(source_key, external_id)`.
   - If content_hash changed vs the existing `opportunities` row, save an `opportunity_revisions` row with a diff of material fields; update the opportunity.
   - If new: insert the opportunity.
5. Update `sources.last_successful_sync_at` and cursor.
6. Update `source_sync_runs` row with counts + `status='success'` (or `partial` / `failed`).
7. On uncaught error: mark run as `failed`, do NOT advance the watermark. Backoff on next tick.

### 2.4 World Bank adapter

- Endpoint: `https://datacatalogapi.worldbank.org/dexapps/fone/api/apiservice?datasetId=DS00979&resourceId=RS00909&type=json`
- Pagination: `top` + `skip`, page size 1000 (SoT §10.1 max).
- Cursor: `{ skip: N }`. On success reset to 0 for next full pass; incremental filtering by `publication_date >= watermark` client-side.
- Deduplication key: `WORLD_BANK:{id}`, fallback sha256(project_id + notice_type + publication_date + bid_description) (SoT §10.1).
- Rate: single request at a time, no burst.
- Health check: `HEAD` on base URL or `GET` with `top=1`.

### 2.5 BPPA adapter (Phase A only)

- Start URL: `https://www.bppa.gov.bd/advertisement-notices/notice-search.html` (public advertisement search).
- Approach: `fetch` + Cheerio (SoT §10.2 "Parsing strategy"). No browser.
- Rate: 1 concurrent, 3-5s between detail-page requests (SoT §10.2 "Recommended request policy").
- UA: `TenderSenseBot/0.1 (+https://tendersense.app; contact=support@tendersense.app)`.
- Cursor: pagination page number.
- Deduplication key: `BD_EGP:{tender_id}`, fallback sha256(reference_no + organization + closing_date + title).
- Health check: `GET` root of `bppa.gov.bd`, assert 200 + a known selector present.
- If markup changes significantly (missing expected selectors on 2 consecutive runs): mark run `failed`, log a warning; do not partially insert.

### 2.6 GitHub Actions cron workflows

- `.github/workflows/sync-worldbank.yml` — daily at 02:00 UTC (~08:00 BD).
- `.github/workflows/sync-bppa.yml` — every 4h.
- Both:
  - Node 22
  - `npm ci` under `apps/web/`
  - `npm run sync:<source>` — one-shot script
  - Secrets from GitHub Environments: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL` (for readiness check)
  - Runs against **hosted `tendersense`** (Phase 0 hosted project remains the dev/staging DB; keep it aligned with prod when we split)
  - `workflow_dispatch: {}` so runs can be triggered manually from the Actions UI

### 2.7 Ingestion CLI scripts (`apps/web/scripts/`)

```
apps/web/scripts/
  sync-worldbank.ts          # entry point for cron job
  sync-bppa.ts               # entry point for cron job
  backfill-worldbank.ts      # one-off backfill by --days=N; ignores watermark
```

`package.json` scripts:
```
"sync:worldbank": "tsx scripts/sync-worldbank.ts",
"sync:bppa": "tsx scripts/sync-bppa.ts",
"backfill:worldbank": "tsx scripts/backfill-worldbank.ts"
```

### 2.8 Tests

- **Unit** — normalizer, hash, adapters mocked at the HTTP layer:
  - WB: sample JSON payload → NormalizedOpportunity with correct fields; unknown fields dropped.
  - BPPA: sample HTML fixture → NormalizedOpportunity; missing optional fields tolerated.
  - Runner: mocked adapter emits 2 pages, second page has one duplicate + one modified record → asserts one revision saved, one new insert.
  - Revision detection: same normalized hash → no revision.
  - Sync failure mid-loop → run marked failed, watermark unchanged.
- **Integration** — extend `tests/integration/`:
  - Real local Supabase, real HTTP mocked with `msw` or `nock`.
  - End-to-end: adapter → runner → DB → assert row counts + revision row.
- **No live-API calls in CI.** All external HTTP mocked. A separate `scripts/smoke:worldbank` and `scripts/smoke:bppa` script exists for manual sanity checks against live sources.

## 3. Decisions to record (ADRs 0006–0009)

- `0006-ingest-runner-pattern.md` — Runner-as-orchestrator vs adapter-owns-run; why we split.
- `0007-content-hash-scope.md` — Which fields participate in `content_hash`; why title changes count as revisions but `last_seen_at` doesn't.
- `0008-github-actions-vs-supabase-cron.md` — Why we use GitHub Actions cron (SoT §8.1) not `pg_cron` or Supabase Scheduled Functions.
- `0009-http-client-choice.md` — Native `fetch` vs `undici` vs `got`; UA + timeout + retry policy.

## 4. TDD gate

Same as Phase 0. Test-first for every file under `lib/ingest/`. Integration tests before wiring cron workflows.

## 5. Sequencing (roughly one PR each)

1. **PR — schema:** migrations 0007–0010, GRANTs, RLS. Local + hosted push. No app code.
2. **PR — adapter contract + normalizer:** `types.ts`, `normalizer.ts`, `http.ts`. Unit tests + fixtures.
3. **PR — World Bank adapter + backfill:** WB adapter, `sync-worldbank.ts` script, backfill script. Live-source smoke test doc.
4. **PR — Runner + revision detection:** `runner.ts` + integration test proving end-to-end path with a mock adapter.
5. **PR — BPPA adapter:** BPPA adapter + `sync-bppa.ts`. Live-source smoke test doc.
6. **PR — Cron workflows:** two GitHub Actions files. Manual `workflow_dispatch` verified in Actions UI.
7. **PR — Docs + ADRs 0006–0009 + tag `v0.2.0-phase1`.**

## 6. Open questions

1. **HTTP client.** Native `fetch` is fine for World Bank (JSON). BPPA (HTML + retry / backoff / concurrency limits) benefits from `undici`'s Agent or a small helper. Confirm: stick with native `fetch` + hand-rolled backoff, or add `undici` explicitly?
2. **Job runtime.** GitHub Actions `ubuntu-latest` runners take ~30-60s just to spin up + `npm ci` + build. For BPPA every 4h at ~30s runtime, that's 6 × ~90s runs/day, well within the free 2000 min/month cap. Confirm we're OK with GHA vs putting sync inside a Next.js Route Handler triggered by an external cron (Upstash / cron-job.org).
3. **Watermark storage.** Adapter cursor in `sources.configuration` (jsonb) — flexible but schema-less. Alternative: dedicated columns per source. Recommend jsonb for Phase 1; formalize if we outgrow it.
4. **Backfill window default.** SoT §10.1 recommends 90–180 days. Confirm target — 180 gives BRAC IT more historical view but doubles seed volume. Recommend **180**.
5. **User-facing feed / list.** SoT §113 Phase 1 exit criterion is "fresh opportunities appear automatically" — that's a DB thing, not a UI thing. Do we ship a bare `/opportunities` list in this phase (helps prove ingestion visually) or wait for Phase 2 (Discovery)? Recommend a **minimal read-only `/opportunities` list** at the tail of Phase 1 so BRAC IT can *see* data flowing, even before matching / filtering exists. Adds ~1 day. Marks as bonus scope.
6. **Time zones.** SoT §72 codifies UTC storage + `Asia/Dhaka` display for BD context; §73 warns about unreliable source dates. Any source date field that lacks a TZ is treated as UTC; confirm this default before we commit it in code.
7. **Compliance boilerplate.** SoT §11 requires a "TenderSense summarizes public procurement info…" disclaimer on any surface that displays opportunities. If we ship the bonus `/opportunities` list, include the disclaimer inline?

## 7. Exit checklist

- [ ] Migrations 0007–0010 applied to local + hosted
- [ ] World Bank sync populates `opportunities` from ~180 days of history (backfill script run once)
- [ ] BPPA sync populates opportunities from the current advertisement pages
- [ ] Both cron workflows visible + successful on green in GitHub Actions
- [ ] `source_sync_runs` table shows one row per run with counts
- [ ] Revision test: manually simulate a title/deadline change in a source_record → next sync produces an `opportunity_revisions` row + updates the parent
- [ ] Integration test: adapter → runner → DB → revision — passing in `npm run test:integration`
- [ ] ADRs 0006–0009 committed
- [ ] `Project_Status.md` updated: `current_phase: "Phase 2 — Discovery (planning)"`
- [ ] Tag `v0.2.0-phase1`

## 8. Rough size

Bigger than Phase 0. Adapter code, HTTP realities, cron infra, and end-to-end runner correctness under partial failures make this a **2–3 week phase** for solo pace, faster with the teammate. Solid-blocker risk: BPPA HTML markup drift (SoT §10.2 warns about it explicitly). Mitigation: parse-with-selectors + auto-disable adapter on 3 consecutive failures.
