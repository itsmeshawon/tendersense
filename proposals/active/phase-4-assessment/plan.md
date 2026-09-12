# Plan: Phase 4 — Assessment

**Tier:** MewKing
**Status:** Draft — awaiting approval after `v0.4.0-phase3` (already tagged)
**Master spec:** `raw/TenderSense_MVP_Source_of_Truth.md` + `raw/TenderSense_Profile_Plan_Individual_Organization.md` (v0.1)
**SoT sections:** §20 Assessment engine · §21 Requirement extraction · §22 Eligibility evaluation · §23 Assessment scoring · §24 Recommendation logic · §25 Preparation window · §33 Assessment APIs · §48 Assessment UX · §88 async execution · §89 idempotency
**Governing ADRs:** 0006 §4 (ambiguity rule), 0016 (deferred signals — credential restoration lands here)
**Exit criteria (SoT §113):** *"assessment provides actionable qualification information"*

---

## 1. Scope

Phase 3 answered *"is this opportunity a good fit for you?"* with a deterministic 0-100 grade.

Phase 4 answers a harder question: *"can you actually qualify for it?"* — parses the tender's requirements into structured items, checks each against workspace evidence, and reports **PASS / GAP / NEEDS_VERIFICATION** per requirement. It's the pilot's "shortlisted → assessed → decision" workflow (SoT §20).

**Structural change**: match grade (fit) and eligibility (qualification) become **two separate signals**, per profile-plan §2 and Raihan-variant learnings. `A — Strong fit` no longer implies `eligible`; a workspace can be `A + Not eligible` (great match but missing a mandatory credential) or `C + Eligible` (weak fit but everything's in order).

**In scope:**

- **Detailed assessment as a deliberate action** (SoT §20) — user clicks "Run Assessment" on a shortlisted opportunity → LLM extracts requirements → evidence check → PASS/GAP/NEEDS_VERIFICATION per requirement → aggregate eligibility score
- **11-category requirement schema** (SoT §21) — legal, financial, technical, experience, personnel, certification, geography, documentation, submission, security, other
- **5-status eligibility set** (SoT §22) — meets · partially_meets · needs_verification · gap · not_applicable. Unknown ≠ gap (ADR 0006 §4)
- **Deep profile schema additions** (profile-plan v0.1 §19–24) — credentials, financial capacity, workforce, evidence documents
- **Assessment quota + subscription tier** — Free plan = N assessments/month, Pro = unlimited (SoT §92, exact N TBD)
- **Async execution** — assessment work exceeds request timeout; needs a job table + worker (SoT §88)
- **Assessment history** per opportunity — every re-run stores a new record; nothing overwrites
- **Recommendation dimension** (SoT §24) — system suggests `Strong Pursue / Potential Pursue / Needs Review / High Risk / Likely Decline`. Human owns final decision (`Pursue / Hold / Decline`) — Phase 5.
- **Opportunity Detail: Eligibility + Requirements + Documents tabs** — completes SoT §6 IA
- **LLM boundary discipline** — one entrypoint (`lib/assessment/extractRequirements`), cached, quota-gated, never on page render (SoT Rule 5 §115)

**Not in scope for Phase 4:**

- Team collaboration / shortlist ownership → Phase 5 (still scope-cut for MVP per ADR 0006 §7 unless explicitly re-opened)
- Email digests, deadline alerts, exports → Phase 6
- Fuzzy matching / embedding-based similarity → post-MVP
- Multi-currency financial evaluation → basic single-currency for MVP, cross-currency deferred

---

## 2. Decisions to make before execution

Ranked by scope impact.

### 2a. Grade scale — keep A/B/C/D or migrate to S/A/B/C?

- **Current** (ADR 0006 §5): `A — Strong fit / B — Good fit / C — Possible / D — Weak fit / Not eligible / Need more info`
- **Raihan variant**: `S / A / B / C` (no D)
- **Trade-off**: our vocabulary is more explicit ("Strong fit" reads better than "S"). His scale is compact and matches convention from other bid-management tools.
- **Recommendation**: keep our current scale. Migration would touch every match row + GradeChip + calibration doc. Not worth it for a naming preference. Reopen ADR 0006 §5 only if a Pro user demands convention alignment.

### 2b. Eligibility as separate signal or overloaded into grade?

- **Current**: `not_eligible` and `need_more_info` are short-circuits inside the *grade* enum
- **Profile plan §2 + Raihan variant**: separate **Match Grade** (A/B/C/D) from **Eligibility** (PASS/FAIL/NEEDS_VERIFICATION)
- **Trade-off**: overloading is simpler; separating is honest. A workspace with A-grade fit but missing a mandatory certification currently reads as "Not eligible" only. Splitting gives `A + PASS`, `A + NEEDS_VERIFICATION`, `A + FAIL` as distinct states.
- **Recommendation**: **separate them.** Add `eligibility` column on `opportunity_matches` (Phase 3 already has `not_eligible` as a grade value; migrate that to the new column). The UI already has room — SoT §6 Opportunity Detail wants an "Eligibility" tab distinct from "Match".

### 2c. Recommendation dimension — 5-way SoT §24 or 4-way Raihan (BID/VERIFY/HOLD/SKIP)?

- **SoT §24**: `Strong Pursue / Potential Pursue / Needs Review / High Risk / Likely Decline`
- **Raihan variant**: `BID / VERIFY / HOLD / SKIP`
- **Trade-off**: Raihan's is action-oriented and compact (better UX). SoT's is more nuanced (better analytics).
- **Recommendation**: adopt Raihan's 4-way as the *display* value; keep SoT's 5-way in the DB as `recommendation_reason` for reports. Simple derivation table.

### 2d. LLM provider

- SoT Rules §115: don't call LLM during page render (Rule 5); don't treat LLM output as authoritative (Rule 6)
- Options: Anthropic Claude (Sonnet), OpenAI GPT, self-hosted
- **Recommendation**: Anthropic Claude Sonnet 4 via API. Reasons: (a) TenderSense is Claude Code-native — same key rotation flow already established in `mewvault/secrets`; (b) Sonnet's long-context handles full tender texts (some run 40+ pages) without chunking; (c) structured output support for the JSON requirement schema. Cost budget: capped by quota per §2f below.
- If AI provider fails: SoT §20 mandate — "mark failed / do not charge usage / allow retry"

### 2e. Async execution architecture

- **SoT §88 recommends** Supabase Edge Function or `jobs` table with worker
- **Trade-off**: Edge Functions add a deployment surface; `jobs` table + a cron-triggered worker (like the existing GH Actions sync workflows) reuses our current infrastructure
- **Recommendation**: **`jobs` table** + a new `.github/workflows/process-assessments.yml` running every 5 minutes. Fits our pattern; no new infra. If throughput becomes a bottleneck later, promote to Edge Function.

### 2f. Free-plan quota

- **Options**: 5/month · 10/month · 20/month · unlimited-for-pilot
- **Recommendation**: **5/month free · unlimited Pro** for MVP. Enough for BRAC IT's demo (they'd assess a few key tenders/week). Bumpable via a config constant, not a schema change.

### 2g. Extraction quality bar

- Assessment quality depends on how well we extract requirements from tender text. Some tenders are 5-page PDFs; some are 50-page government RFPs.
- **Recommendation**: MVP handles **HTML/text descriptions only**. PDF extraction is a Phase 4.5 follow-up if pilot flags it as a blocker. Log the source-text length in every assessment record so we can see where PDF gaps are hurting.

---

## 3. Schema additions (migrations 0020–0028)

Migration numbering assumes 0018–0019 are already applied on hosted (they are).

### 0020 assessments

```sql
create table public.assessments (
  id                      uuid primary key default gen_random_uuid(),
  workspace_id            uuid not null references public.workspaces(id) on delete cascade,
  opportunity_id          uuid not null references public.opportunities(id) on delete cascade,
  status                  text not null check (status in ('queued', 'running', 'succeeded', 'failed')),
  eligibility             text check (eligibility in ('pass', 'partial', 'needs_verification', 'fail', 'not_evaluated')),
  eligibility_score       smallint,           -- 0..100
  recommendation          text check (recommendation in ('bid', 'verify', 'hold', 'skip')),
  recommendation_reason   text check (recommendation_reason in ('strong_pursue', 'potential_pursue', 'needs_review', 'high_risk', 'likely_decline')),
  summary                 text,                -- LLM-generated, human-readable
  category_scores         jsonb not null default '{}'::jsonb,  -- {strategic_fit: 82, eligibility: 78, ...}
  extraction_meta         jsonb not null default '{}'::jsonb,  -- model, tokens_in, tokens_out, took_ms, source_text_len
  requested_by            uuid references public.profiles(id),
  requested_at            timestamptz not null default now(),
  completed_at            timestamptz,
  error                   text,
  scoring_version         integer not null default 1,
  idempotency_key         text,
  unique (workspace_id, opportunity_id, idempotency_key)
);
```

RLS: workspace members read; service-role writes.

### 0021 requirements + evaluations

```sql
create table public.opportunity_requirements (
  id                uuid primary key default gen_random_uuid(),
  assessment_id     uuid not null references public.assessments(id) on delete cascade,
  category          text not null,           -- 11-category set from SoT §21
  text              text not null,
  normalized_key    text,
  mandatory         boolean not null default true,
  threshold         jsonb,                    -- {operator, value, unit}
  source_location   text,
  confidence        real
);

create table public.requirement_evaluations (
  id                uuid primary key default gen_random_uuid(),
  requirement_id    uuid not null references public.opportunity_requirements(id) on delete cascade,
  status            text not null check (status in ('meets', 'partially_meets', 'needs_verification', 'gap', 'not_applicable')),
  evidence_refs     jsonb not null default '[]'::jsonb,   -- [{type, id, excerpt, confidence}]
  reasoning         text
);
```

### 0022 credentials (restores ADR 0016's deferred credential signal)

```sql
create table public.workspace_credentials (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  credential_type   text not null,          -- ISO, CMMI, business_license, etc.
  name              text not null,
  issuer            text,
  credential_number text,
  issue_date        date,
  expiry_date       date,
  status            text default 'valid' check (status in ('valid', 'expired', 'revoked')),
  country_code      text,
  evidence_document_id uuid,                -- FK to evidence_documents (0024)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
```

Also: matching-engine change — restore the credential signal (ADR 0016 pins the recovery path). Bump `SCORING_VERSION` to 2.

### 0023 financial_capacity

```sql
create table public.workspace_financials (
  id                        uuid primary key default gen_random_uuid(),
  workspace_id              uuid not null references public.workspaces(id) on delete cascade,
  fiscal_year               integer not null,
  currency                  text not null,
  annual_turnover           numeric,
  net_worth                 numeric,
  liquid_assets             numeric,
  largest_contract_value    numeric,
  is_audited                boolean default false,
  evidence_document_id      uuid,
  created_at                timestamptz not null default now(),
  unique (workspace_id, fiscal_year)
);
```

Row-level: profile-plan §21 flags financial data as sensitive. RLS restricts to workspace **admins** only (add a role check on top of workspace_member).

### 0024 evidence_documents

```sql
create table public.evidence_documents (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  document_type   text not null,           -- CV, certificate, contract, financial_statement, etc.
  file_name       text not null,
  storage_path    text not null,            -- Supabase Storage key
  file_size       integer,
  content_type    text,
  uploaded_by     uuid references public.profiles(id),
  uploaded_at     timestamptz not null default now(),
  extracted_text  text,                     -- populated by background extraction
  extraction_status text default 'pending' check (extraction_status in ('pending', 'succeeded', 'failed'))
);
```

Uses Supabase Storage (private bucket). Access via signed URLs only.

### 0025 workforce + key_experts

```sql
create table public.workspace_workforce (
  workspace_id    uuid primary key references public.workspaces(id) on delete cascade,
  total_employees integer,
  role_counts     jsonb not null default '{}'::jsonb,  -- {engineers: 40, project_managers: 8, ...}
  updated_at      timestamptz not null default now()
);

create table public.workspace_experts (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  name              text not null,
  role              text,
  years_experience  integer,
  sectors           text[],
  availability      text,
  cv_document_id    uuid,
  created_at        timestamptz not null default now()
);
```

### 0026 jobs (async runner)

```sql
create table public.jobs (
  id            uuid primary key default gen_random_uuid(),
  type          text not null,           -- 'assessment.run', 'document.extract'
  payload       jsonb not null,
  status        text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed')),
  attempts      integer not null default 0,
  max_attempts  integer not null default 3,
  available_at  timestamptz not null default now(),
  locked_at     timestamptz,
  locked_by     text,
  last_error    text,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);
create index jobs_available_idx on public.jobs (available_at) where status = 'queued';
create index jobs_type_idx on public.jobs (type);
```

Worker leases via `select … for update skip locked` pattern.

### 0027 usage tracking

```sql
create table public.workspace_usage (
  workspace_id   uuid not null references public.workspaces(id) on delete cascade,
  period_month   date not null,               -- first-of-month
  assessments_used integer not null default 0,
  primary key (workspace_id, period_month)
);
```

### 0028 opportunity_matches: split grade / eligibility

Migration to enact §2b (separate the two dimensions):

```sql
alter table public.opportunity_matches
  add column eligibility text check (eligibility in ('pass', 'partial', 'needs_verification', 'fail', 'not_evaluated'))
    default 'not_evaluated',
  add column eligibility_computed_at timestamptz;

-- Migrate existing not_eligible grades to eligibility='fail' + grade='D' (or highest applicable)
update public.opportunity_matches
  set eligibility = 'fail', grade = 'D'
  where grade = 'not_eligible';

-- 'need_more_info' stays as-is (it's a state before any evaluation, not a fit signal)
```

Then remove `not_eligible` from the grade check constraint (deferred to a later migration to avoid breakage).

---

## 4. Deliverables

### 4.1 Backend

- **`lib/assessment/extractRequirements.ts`** — the single LLM entrypoint. Signature: `(opportunityText, opportunityMeta) → RequirementList`. Returns the SoT §21 JSON schema. Cached in `assessments.extraction_meta`.
- **`lib/assessment/evaluate.ts`** — per-requirement evaluator. Deterministic: given a requirement + workspace snapshot (credentials, projects, financials, workforce), computes `status ∈ {meets, partially_meets, needs_verification, gap, not_applicable}` with reasoning. No LLM here — the LLM already gave us the requirement; evaluation is a rules engine.
- **`lib/assessment/score.ts`** — aggregates evaluations into category scores per SoT §23. Recomputes overall eligibility_score (0-100) and derives recommendation via the 4-way mapping (§2c).
- **`lib/jobs/runner.ts`** — leases + processes queued jobs. First job type: `assessment.run`.
- **`lib/matching/signals.ts`** — restore the credential signal (ADR 0016 recovery). Weight 5 (rebalance existing 5-dim to 6-dim per §2h below). Bump `SCORING_VERSION` to 2.

### 4.2 Frontend

- **`/opportunities/[id]` Eligibility tab** — new tab. Shows assessment history, latest verdict, category score breakdown, per-requirement evaluations. "Run Assessment" button if none exists (respecting quota).
- **`/opportunities/[id]` Requirements tab** — LLM-extracted requirement list, grouped by category, each with source-location backlink. Read-only.
- **`/opportunities/[id]` Documents tab** — evidence documents linked to this opportunity's assessment. Upload here or link from workspace evidence library.
- **`/workspaces/[id]/credentials`** — CRUD UI for `workspace_credentials`. Add / expire / attach evidence.
- **`/workspaces/[id]/financials`** — restricted-access CRUD. Admin-only.
- **`/workspaces/[id]/workforce`** — count + role breakdown. Simple form.
- **`/workspaces/[id]/experts`** — key expert directory. Reuses parts of the eExperience-import flow for CV uploads.
- **`/workspaces/[id]/evidence`** — document library. Upload / classify / view text extraction status.

### 4.3 UI signal changes

- **`GradeChip` gains a second badge**: grade + eligibility rendered side-by-side. E.g. `A — Strong fit` + `Eligible (PASS)`. Recommendation chip (`Bid` / `Verify` / `Hold` / `Skip`) below on detail pages, absent on the compact list.
- **Sort options**: add `eligible_first` (eligibility=pass first) alongside the existing `grade_desc`.

### 4.4 Cron / infrastructure

- New workflow: `.github/workflows/process-jobs.yml` — every 5 minutes, dispatches the runner. Same pattern as existing sync workflows. Concurrency guard so only one worker at a time.

### 4.5 Rate-limit and quota UX

- Free plan: 5 assessments per workspace per calendar month. Enforced server-side in the RPC that queues an assessment job.
- Rejection copy on hitting quota: *"You've used all 5 assessments for this month. Upgrade to Pro for unlimited, or wait for [next month reset date]."*

### 4.6 Tests

- **Unit**: per-signal evaluator tests (meets / partially_meets / needs_verification / gap / not_applicable for each category)
- **Unit**: LLM output shape validator — reject malformed JSON, retry on parse fail, fall back to `mark failed`
- **Integration**: end-to-end assessment run against a fixture opportunity + fixture workspace → assert final eligibility + recommendation
- **Live smoke**: run one real assessment on prod against a BRAC IT match; confirm quota decremented, job completed, tabs render

---

## 5. Decisions to record as ADRs

- `0020-eligibility-separate-from-grade.md` — per §2b. Records the schema split + migration path.
- `0021-recommendation-vocabulary.md` — per §2c. Records the 4-way display / 5-way internal decision.
- `0022-llm-provider-selection.md` — Anthropic Claude Sonnet as the assessment LLM. Boundary rules (no page-render calls, cached, quota-gated, mark-failed-no-charge on provider outage).
- `0023-jobs-table-worker-pattern.md` — reject Edge Functions for MVP; use jobs table + cron worker. Same reasoning as ADR 0009 (cron infra).
- `0024-assessment-quota-tier.md` — 5 free/month, unlimited Pro. Reopen when we have real usage data.
- `0025-credential-signal-restoration.md` — ADR 0016's recovery path enacted. Weight 5, rebalance to 6-dim (see §2h).
- `0026-evidence-documents-storage.md` — private Supabase Storage bucket, signed URLs only, background text extraction.

---

## 6. Open questions (need answers before approval)

1. **§2a grade scale** — keep `A/B/C/D` or migrate to `S/A/B/C`? Recommend keep.
2. **§2b eligibility split** — separate column? Recommend yes.
3. **§2c recommendation** — 4-way display / 5-way reason? Recommend yes.
4. **§2d LLM provider** — Anthropic Claude Sonnet 4? Confirm cost budget acceptable.
5. **§2e async** — `jobs` table? Recommend yes.
6. **§2f quota** — 5/month free? Confirm.
7. **§2g PDF extraction** — HTML/text-only MVP with PDF as Phase-4.5 follow-up? Or block Phase 4 on PDF?
8. **§2h weight rebalance** — new 6-dim weights when credential signal restores. Suggested: capability 33 · sector 18 · keyword 18 · past_project 14 · country 10 · credential 7 = 100. Confirm or override.
9. **Sensitive-field UI** — do free users see the financial capacity form (grayed out with upgrade nudge) or hidden entirely? Recommend: **shown grayed out** per profile-plan §37.
10. **Assessment history retention** — SoT §20 says every re-run creates a new record. Keep forever, or auto-archive after 12 months? Recommend keep forever (audit trail).

---

## 7. Exit checklist

- [ ] Migrations 0020–0028 applied to local + hosted
- [ ] LLM entrypoint (`lib/assessment/extractRequirements`) with fixture-tested schema output
- [ ] Deterministic evaluator (`lib/assessment/evaluate`) with unit tests per SoT §22 status
- [ ] Score aggregator per SoT §23
- [ ] Jobs runner + cron workflow
- [ ] Credentials / Financials / Workforce / Experts / Evidence CRUD UIs
- [ ] Opportunity Detail: Eligibility + Requirements + Documents tabs
- [ ] Match schema split: eligibility column populated on all rows
- [ ] Credential signal restored, `SCORING_VERSION = 2`
- [ ] Assessment quota enforced server-side, UX handles the rejection gracefully
- [ ] LLM provider outage tested — assessment marked failed, quota not decremented
- [ ] ADRs 0020–0026 committed
- [ ] Manual pilot smoke: run assessment on a BRAC IT B-graded tender → produces requirements list → per-requirement PASS/GAP verdict → final eligibility score + recommendation
- [ ] Tag `v0.5.0-phase4`

---

## 8. Sequencing (approximately one PR per bullet)

Approximate order. Each is a session's worth of work.

1. **Schema PR (0020–0026)**: assessments · requirements · evaluations · credentials · financials · workforce · experts · evidence · jobs · usage · match-schema-split. Applied to hosted before subsequent work.
2. **Credentials + Financials + Workforce/Experts CRUD UI**: workspace-side ingestion so we have inputs to evaluate against. Multi-select, gray-out for free users.
3. **Evidence documents upload + storage + text extraction**: Supabase Storage bucket, signed URLs, background text extraction into `extracted_text` via a job.
4. **Jobs runner + cron workflow**: infrastructure for async work. `assessment.run` handler is a stub that logs.
5. **LLM entrypoint + fixture tests**: `extractRequirements(opportunityText)`. Provider = Claude Sonnet via Anthropic API. Cached in DB.
6. **Deterministic evaluator + scorer**: per-requirement + per-category. Rules engine over workspace snapshot.
7. **Assessment runner (job handler)**: ties LLM extraction + evaluator + scorer into one end-to-end flow. Writes back to assessments row.
8. **Opportunity Detail tabs**: Eligibility, Requirements, Documents. Read-side only.
9. **"Run Assessment" button + quota RPC**: user-facing trigger. Enforce quota server-side.
10. **Two-signal GradeChip + list UI**: grade + eligibility badges side-by-side. Sort by `eligible_first`.
11. **Credential signal restoration + `SCORING_VERSION = 2` recompute**: enact ADR 0016. Backfill match rows.
12. **Cross-cutting review + calibration**: run 5 assessments on BRAC IT B-graded tenders, compare against Raihan-variant output where possible, tune. Tag `v0.5.0-phase4`.

---

## 9. Rough size

**5–7 weeks solo pace, 3–5 weeks with the teammate.** Bigger than Phase 3.

Breakdown:
- Schema + jobs infra: ~1 week (mostly SQL + boilerplate, low novelty)
- Credential/financial/workforce/expert/evidence CRUD: ~1 week (5 forms, similar shape)
- LLM entrypoint + evaluator + scorer: ~2 weeks (the hard part — prompt engineering + testing against real tenders)
- Assessment UI (Detail tabs + Run button + quota): ~1 week
- Two-signal UI + credential-signal restoration: ~0.5 weeks
- Cross-cutting review + calibration + tag: ~0.5 weeks

Fastest win path: schema first, then LLM entrypoint + fixture-heavy testing before touching UI. UI is meaningful only once real requirement extraction works.

---

## 10. Why this is more than "add a form"

Phase 4 introduces **three new subsystems** the codebase hasn't had before:

1. **LLM boundary discipline** — first place we call an external AI. Sets the pattern for future AI features. Must fail safely, cache aggressively, never render-block, never claim authority.
2. **Async job execution** — first place we can't respond in-request. Jobs table + worker + cron. Sets the pattern for future long-running work (bulk imports, exports, digests).
3. **Two-dimensional verdict** — grade + eligibility replaces our current single-grade output. Every downstream reader (list UI, dashboard, notifications, reports) needs updating.

Each of these can fail independently in ways the earlier phases couldn't. Test coverage matters more here.

---

## 11. What Phase 4 unlocks for the pilot

- **BRAC IT can commit to a bid decision with evidence**, not gut feel. "A + PASS + Strong Pursue" is the story we want to tell.
- **SoT §114 items 6, 8, 9** all close.
- **Peak 4 of the pilot demo** (post-shortlist territory): "here's the assessment; here's what's missing to bid; here's the recommendation with reasons."
- **Profile-plan §2 realized**: separate Fit and Qualification. Discovery becomes "does it look interesting?" and Assessment becomes "can we actually win it?"
