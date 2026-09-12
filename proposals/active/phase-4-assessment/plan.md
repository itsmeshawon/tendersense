# Plan: Phase 4 — Assessment

**Tier:** MewKing
**Status:** APPROVED v2 (2026-09-13) — all 10 open questions resolved; **no LLM in MVP** per cost-avoidance decision. Execution unlocked.
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
- **Rule-based requirement extraction + manual entry fallback** — no LLM in MVP. A pattern library covers ~60-70% of common tender phrases ("Minimum X years experience", "ISO 27001 certification required", "Turnover >= BDT Y"). Anything the rules miss, the workspace admin enters manually via a "Add requirement" form. This trades magic for auditability + zero external-provider cost.

**Not in scope for Phase 4:**

- Team collaboration / shortlist ownership → Phase 5 (still scope-cut for MVP per ADR 0006 §7 unless explicitly re-opened)
- Email digests, deadline alerts, exports → Phase 6
- Fuzzy matching / embedding-based similarity → post-MVP
- Multi-currency financial evaluation → basic single-currency for MVP, cross-currency deferred

---

## 2. Decisions (all resolved 2026-09-13)

### 2a. Grade scale
**Decided: keep `A / B / C / D` + `Not eligible` + `Need more info`** (ADR 0006 §5 unchanged). Migration to Raihan's `S/A/B/C` would touch every match row + GradeChip + calibration doc for a naming preference. Reopen only if a Pro customer demands convention alignment.

### 2b. Eligibility split
**Decided: separate `eligibility` column on `opportunity_matches`.** Current `not_eligible` grade migrates to `eligibility='fail' + grade='D'`. Enables the honest four-quadrant view: `A + PASS` / `A + FAIL` / `C + PASS` / etc. SoT §6 Opportunity Detail already reserves a distinct "Eligibility" tab. Recorded in ADR 0020.

### 2c. Recommendation dimension
**Decided: 4-way BID / VERIFY / HOLD / SKIP as display; 5-way SoT (`strong_pursue / potential_pursue / needs_review / high_risk / likely_decline`) stored as `recommendation_reason` for reports.** Simple derivation table:

| Reason | Display |
|---|---|
| `strong_pursue` | `BID` |
| `potential_pursue` | `BID` |
| `needs_review` | `VERIFY` |
| `high_risk` | `HOLD` |
| `likely_decline` | `SKIP` |

Recorded in ADR 0021.

### 2d. Requirement extraction — **NO LLM in MVP**
**Decided: rule-based pattern library + manual entry fallback.** Zero external-provider cost. Two subsystems:

- **`lib/assessment/rulesExtractor.ts`** — a hand-authored pattern library of ~30 common tender-requirement shapes ("Minimum X years experience", "ISO NNNNN certification required", "Turnover >= BDT Y in last N years", "At least N similar projects", country/geography clauses, submission-window rules, etc.). Regex + NLP-lite tokenization. Auditable, deterministic, expandable via a JSON config.
- **`lib/assessment/manualRequirement.ts`** — server action to add / edit / remove a requirement on an assessment. Workspace admin curates whatever the rules miss.

Expected recall: 60-70% on structured WB/e-GP notices; lower on unstructured tender text. Precision high (rules don't hallucinate).

**LLM as follow-up:** if pilot demand justifies, Phase 4.5 or Phase 5 can add an "Auto-fill from source" button that calls Claude/GPT once per assessment, cached forever. Cost model at that point is per-assessment, quota-gated, opt-in per workspace. Not shipping in MVP.

Recorded in ADR 0022.

### 2e. Async execution
**Decided: `jobs` table + cron worker.** Same pattern as existing sync workflows. New workflow `.github/workflows/process-jobs.yml` runs every 5 minutes. Job types for MVP: `document.extract` (parse uploaded evidence). Assessment runs themselves are fast (rules + evaluator, no LLM) so they execute synchronously in the server action — no queue needed for that. Recorded in ADR 0023.

### 2f. Free-plan quota
**Decided: 5 assessments/month free · unlimited Pro.** Enforced server-side in the "Run Assessment" RPC. Bumpable via a config constant. Recorded in ADR 0024.

### 2g. Extraction source scope
**Decided: HTML/text descriptions only for MVP.** PDF extraction deferred to Phase 4.5. Log `source_text_len` on every assessment so we can quantify pilot-time PDF gaps and decide when to invest.

### 2h. 6-dim weight rebalance (credential signal restored)
**Decided:** `capability 33 · sector 18 · keyword 18 · past_project 14 · country 10 · credential 7 = 100`. Credential signal fires when the workspace has ≥1 valid credential matching a required certification on the opportunity. Bumps `SCORING_VERSION` to 2 — all existing match rows re-scored. Recorded in ADR 0025.

### 2i. Sensitive-field UI (Free tier)
**Decided: gray out with upgrade nudge** per profile-plan §37. Free users see the Financials tab exists and what it does; the form fields are disabled with a subtle "Available on Pro" tooltip. Not hidden entirely — awareness matters even if usage is gated.

### 2j. Assessment history retention
**Decided: keep forever.** Every re-run creates a new `assessments` row (SoT §20). Audit trail justifies the storage cost. Auto-archive is a future optimization when the DB shows real growth pressure.

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
  extraction_method       text not null default 'rules' check (extraction_method in ('rules', 'manual', 'mixed')),
  extraction_meta         jsonb not null default '{}'::jsonb,  -- rule_hits, manual_added, source_text_len, took_ms
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

- **`lib/assessment/rulesExtractor.ts`** — pattern library over opportunity title + description. Returns `Requirement[]` per SoT §21 schema, each tagged `confidence` + `sourceLocation`. Extensible — patterns live in a JSON config, adding a rule is one PR touching one file.
- **`lib/assessment/manualRequirement.ts`** — server actions for add / edit / remove of requirement rows on a queued or in-flight assessment. Marks the assessment's `extraction_method` as `mixed` if both rules and manual are present.
- **`lib/assessment/evaluate.ts`** — per-requirement evaluator. Deterministic: given a requirement + workspace snapshot (credentials, projects, financials, workforce), computes `status ∈ {meets, partially_meets, needs_verification, gap, not_applicable}` with reasoning.
- **`lib/assessment/score.ts`** — aggregates evaluations into category scores per SoT §23. Recomputes overall eligibility_score (0-100) and derives recommendation via the 4-way mapping (§2c).
- **`lib/assessment/run.ts`** — the "Run Assessment" orchestrator. Server-action-invoked, synchronous (rules + evaluator are fast). Steps: (a) load opportunity, (b) rulesExtractor → requirements, (c) load workspace snapshot, (d) evaluate each, (e) score, (f) write assessments + opportunity_requirements + requirement_evaluations rows, (g) decrement quota.
- **`lib/jobs/runner.ts`** — leases + processes queued jobs. First job type: `document.extract` (parse uploaded evidence into text).
- **`lib/matching/signals.ts`** — restore the credential signal (ADR 0016 recovery). Weight 7 per §2h. Bump `SCORING_VERSION` to 2.

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
- `0022-rule-based-requirement-extraction.md` — per §2d. **No LLM in MVP.** Rationale: cost avoidance + auditability + deterministic behavior. Pattern-library approach; LLM auto-fill deferred to Phase 4.5+ as opt-in per workspace.
- `0023-jobs-table-worker-pattern.md` — reject Edge Functions for MVP; use jobs table + cron worker. Only job type for MVP is `document.extract` (LLM assessment jobs would live here later if added).
- `0024-assessment-quota-tier.md` — 5 free/month, unlimited Pro. Reopen when we have real usage data.
- `0025-credential-signal-restoration.md` — ADR 0016's recovery path enacted. 6-dim rebalance per §2h.
- `0026-evidence-documents-storage.md` — private Supabase Storage bucket, signed URLs only, background text extraction.

---

## 6. All decisions resolved (2026-09-13)

Ten open questions closed as recorded in §2a-j above. Approvals:

| # | Question | Decision |
|---|---|---|
| 2a | Grade scale | Keep `A/B/C/D` |
| 2b | Eligibility split | Separate column |
| 2c | Recommendation | 4-way display + 5-way reason |
| 2d | LLM | **No LLM in MVP.** Rule-based + manual entry |
| 2e | Async | `jobs` table + cron worker |
| 2f | Quota | 5 free/month, unlimited Pro |
| 2g | PDF extraction | HTML-only; PDF is Phase 4.5 |
| 2h | 6-dim rebalance | 33 · 18 · 18 · 14 · 10 · 7 |
| 2i | Sensitive-field UI | Grayed with upgrade nudge |
| 2j | History retention | Keep forever |

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

1. **Schema PR (0020–0028)**: assessments · requirements · evaluations · credentials · financials · workforce · experts · evidence · jobs · usage · match-schema-split. Applied to hosted before subsequent work.
2. **Credentials + Financials + Workforce/Experts CRUD UI**: workspace-side ingestion so we have inputs to evaluate against. Multi-select, financials grayed for free users per §2i.
3. **Evidence documents upload + storage + text extraction (jobs pattern)**: Supabase Storage bucket, signed URLs, background `document.extract` job writes into `extracted_text`. Establishes the jobs+worker pattern with one concrete job type.
4. **Rule-based requirement extractor**: `lib/assessment/rulesExtractor.ts` with ~30 patterns + JSON config. Fixture-tested against a curated corpus of real WB + e-GP + BPPA tender descriptions. Aim for 60-70% recall.
5. **Manual requirement entry** (server actions): add / edit / remove requirements on an assessment. Sets `extraction_method = 'mixed'` when combined with rules.
6. **Deterministic evaluator + scorer**: per-requirement 5-status evaluation + per-category aggregation per SoT §22-23.
7. **Assessment runner** (`lib/assessment/run.ts`): synchronous orchestrator invoked from a server action. Extracts → evaluates → scores → writes.
8. **Opportunity Detail tabs**: Eligibility, Requirements, Documents. Requirements tab shows source-location backlinks + "manually added" badges.
9. **"Run Assessment" button + quota RPC**: user-facing trigger. Server-side quota enforcement + rejection copy.
10. **Two-signal GradeChip + list UI**: grade + eligibility badges side-by-side on `/opportunities`. Sort adds `eligible_first`.
11. **Credential signal restoration + `SCORING_VERSION = 2` recompute**: enact ADR 0025. 6-dim rebalance. Backfill all match rows.
12. **Cross-cutting review + tag `v0.5.0-phase4`**: run 5-10 assessments on BRAC IT B-graded tenders; walk the bid team through the rule-based verdicts; note where manual entry filled gaps (drives the pattern-library expansion for the next release).

---

## 9. Rough size

**~3-5 weeks solo pace, 2-3 weeks with the teammate.** Cutting LLM saves ~2 weeks vs the original estimate.

Breakdown:
- Schema + jobs infra: ~1 week (mostly SQL + boilerplate, low novelty)
- Credential/financial/workforce/expert/evidence CRUD: ~1 week (5 forms, similar shape to Phase 2 monitoring UI)
- Rule-based extractor + evaluator + scorer: ~1 week (pattern library is the hard part; fixture-heavy testing but bounded by the pattern count)
- Assessment UI (Detail tabs + Run button + quota + manual-add): ~1 week
- Two-signal UI + credential-signal restoration: ~0.5 weeks
- Cross-cutting review + tag: ~0.5 weeks

Fastest win path: schema first, then evaluator + scorer with hand-authored fixtures (deterministic — easy to test), then extractor, then UI last.

---

## 10. Why this is more than "add a form"

Phase 4 introduces **two new subsystems** the codebase hasn't had before:

1. **Async job execution** — first place we can't respond in-request. Jobs table + worker + cron. Only one job type in MVP (`document.extract`) but establishes the pattern for future long-running work (bulk imports, exports, digests, and eventually the deferred LLM entrypoint).
2. **Two-dimensional verdict** — grade + eligibility replaces our current single-grade output. Every downstream reader (list UI, dashboard, notifications, reports) needs updating.

Each of these can fail independently in ways the earlier phases couldn't. Test coverage matters more here.

**Deferred:** LLM boundary discipline. When LLM auto-fill is added later (as opt-in per workspace with cost model), it becomes subsystem #3 — with a single `lib/assessment/llmExtractor.ts` entrypoint, cached forever, quota-gated, mark-failed-no-charge on outage, and a Rules-first-LLM-fallback merge policy so the rule-based baseline is never lost.

---

## 11. What Phase 4 unlocks for the pilot

- **BRAC IT can commit to a bid decision with evidence**, not gut feel. "A + PASS + Strong Pursue" is the story we want to tell.
- **SoT §114 items 6, 8, 9** all close.
- **Peak 4 of the pilot demo** (post-shortlist territory): "here's the assessment; here's what's missing to bid; here's the recommendation with reasons."
- **Profile-plan §2 realized**: separate Fit and Qualification. Discovery becomes "does it look interesting?" and Assessment becomes "can we actually win it?"
