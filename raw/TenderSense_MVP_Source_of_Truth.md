# TenderSense — MVP Source of Truth (SOT)

> **Document purpose:** This is the single implementation reference for building the TenderSense MVP.  
> **Audience:** Founder/product owner, AI coding agents, frontend/backend engineers, QA, and future collaborators.  
> **Status:** MVP / Pilot specification  
> **Primary pilot organization:** BRAC IT Services  
> **Version:** 0.2  
> **Date:** 2026-09-11  
> **Principle:** Build the smallest reliable system that can prove discovery, qualification, and earlier bid decisions before investing in a larger procurement platform.

---

# 1. Product Definition

## 1.1 What TenderSense is

TenderSense is a tender discovery and qualification platform that helps individuals and organizations:

1. discover relevant procurement opportunities,
2. understand why an opportunity matches them,
3. identify eligibility requirements and gaps,
4. decide whether to pursue, hold, or decline,
5. organize lightweight preparation activities before submission.

TenderSense is **not** an e-procurement submission system and is **not** intended to replace official procurement portals.

TenderSense must always preserve the official source URL and make it easy for the user to verify the original notice and documents.

---

## 1.2 Core product promise

> **Find the right opportunities earlier, understand whether you qualify, and decide what to pursue before it is too late.**

The product value chain is:

```text
DISCOVER
   ↓
UNDERSTAND
   ↓
ASSESS
   ↓
DECIDE
   ↓
PREPARE
```

The intelligence foundation is:

```text
                    ORGANIZATION / INDIVIDUAL PROFILE
                              │
                              ▼
SOURCE DATA → NORMALIZE → MATCH → ASSESS → DECIDE → PREPARE
                              ▲
                              │
                        EVIDENCE / DOCUMENTS
```

---

# 2. MVP Objectives

The MVP exists to validate four hypotheses.

## H1 — Earlier discovery

TenderSense helps users find relevant opportunities earlier than their current manual process.

**Measure:**
- number of relevant opportunities discovered,
- median days remaining when discovered,
- percentage of opportunities discovered >14, >21, and >30 days before deadline.

## H2 — Lower assessment effort

TenderSense reduces the effort required to understand whether an opportunity is relevant.

**Measure:**
- minutes from first view to preliminary decision,
- number of documents/pages manually reviewed,
- user-reported assessment effort.

## H3 — Better qualification consistency

TenderSense creates a repeatable structure for evaluating suitability and eligibility.

**Measure:**
- percentage of assessments where users agree with the generated match reasons,
- percentage of eligibility items correctly categorized,
- manual corrections per assessment.

## H4 — Earlier decision

TenderSense supports faster pursue / hold / decline decisions.

**Measure:**
- days between discovery and decision,
- days remaining at decision,
- percentage of shortlisted opportunities with an explicit decision.

---

# 3. MVP Non-Goals

Do **not** implement these in the first MVP unless needed to unblock validation:

- automated bid submission,
- proposal authoring,
- proposal document version control,
- e-GP login automation,
- CAPTCHA bypass,
- tender document purchasing,
- bank guarantee workflows,
- payment handling for official tender systems,
- contract management,
- supplier marketplace,
- consortium marketplace,
- complete CRM,
- complex organization hierarchy,
- SSO/SAML,
- enterprise approval workflow designer,
- full procurement ERP,
- advanced BI warehouse,
- native mobile apps.

---

# 4. User Types

## 4.1 Individual user

Examples:

- consultant,
- freelancer,
- independent expert,
- founder,
- small business owner.

Primary need:

> “Show me relevant opportunities without forcing me to monitor many procurement portals.”

## 4.2 Organization user

Examples:

- BRAC IT,
- software company,
- consulting firm,
- NGO,
- engineering company,
- supplier.

Primary need:

> “Show us opportunities we can realistically pursue, explain our gaps, and help the team make a bid/no-bid decision.”

---

# 5. Plan Model

## 5.1 Free — Discover

For individuals or small organizations exploring opportunities.

### Entitlements

- one workspace,
- one user,
- individual or organization profile,
- manually maintained profile,
- supported public tender sources,
- search by keyword/service/country/source/deadline,
- basic personalized feed,
- matching reasons,
- five detailed assessments per calendar month,
- in-app updates,
- bookmarks,
- personal notes,
- original tender source links,
- basic activity view.

## 5.2 Pro — Assess & Collaborate

For active tender teams such as BRAC IT.

Includes Free plus:

- five included organization users,
- document uploads,
- evidence-backed organization profile,
- multiple monitoring preferences,
- saved searches,
- advanced filters,
- project/credential/preference matching,
- 100 detailed assessments per calendar month,
- expandable assessment usage,
- daily email digest,
- amendment alerts,
- deadline-change alerts,
- shared shortlist,
- opportunity ownership,
- team comments,
- decision dates,
- pursue / hold / decline with reasons,
- decision history,
- requirement checklists,
- preparation tasks,
- milestones,
- team reports,
- shortlist exports.

---

# 6. Core Information Architecture

```text
TenderSense

├── Home
│   ├── Recommended opportunities
│   ├── New opportunities
│   ├── Needs attention
│   ├── Upcoming deadlines
│   ├── Recent amendments
│   └── Assessment usage
│
├── Discover
│   ├── For You
│   ├── All Opportunities
│   ├── Search
│   ├── Filters
│   ├── Saved Searches
│   └── Opportunity Detail
│       ├── Overview
│       ├── Match
│       ├── Eligibility
│       ├── Requirements
│       ├── Timeline
│       ├── Documents
│       └── Source
│
├── Shortlist
│   ├── Reviewing
│   ├── Pursue
│   ├── Hold
│   ├── Decline
│   └── Opportunity Workspace
│       ├── Overview
│       ├── Assessment
│       ├── Requirements
│       ├── Preparation
│       └── Activity
│
├── Workspace
│   ├── Profile
│   ├── Monitoring
│   ├── Team
│   └── Activity
│
├── Reports
│   ├── Pipeline
│   ├── Decisions
│   ├── Sources
│   └── Exports
│
└── Settings
    ├── Account
    ├── Workspace
    ├── Notifications
    ├── Subscription
    └── Usage
```

---

# 7. Core Domain Objects

The implementation must treat the following as first-class domain objects.

## 7.1 Workspace

A personal or organization container.

```ts
type WorkspaceType = "individual" | "organization";
type Plan = "free" | "pro";
```

## 7.2 Profile

Structured capability information used for matching.

## 7.3 Opportunity

Normalized representation of a source procurement notice.

## 7.4 Source record

Raw or minimally processed payload from World Bank, BPPA, or another procurement source.

## 7.5 Match

Fast, inexpensive relevance calculation between a workspace and an opportunity.

## 7.6 Assessment

Deeper qualification analysis. This consumes monthly assessment allowance.

## 7.7 Requirement

A structured criterion extracted from an opportunity.

## 7.8 Evidence

A company capability, credential, project, certification, financial fact, or uploaded document supporting a requirement.

## 7.9 Shortlist item

A workspace-specific relationship to an opportunity.

## 7.10 Decision

Pursue, hold, or decline.

## 7.11 Preparation task

A lightweight task related to a shortlisted opportunity.

---

# 8. Recommended Technology Stack

## 8.0 Locked MVP Stack

The TenderSense MVP technology stack is **locked** to:

```text
Application:       Next.js
Language:          TypeScript
Database:          Supabase PostgreSQL
Authentication:    Supabase Auth
File Storage:      Supabase Storage
Security:          Supabase Row Level Security
Hosting:           Vercel
Repository:        GitHub
CI/CD:             GitHub + Vercel
Scheduled Jobs:    GitHub Actions
```

Architecture:

```text
User
  ↓
Vercel
  ↓
Next.js + TypeScript
  ├── UI
  ├── Server Components
  ├── Route Handlers / Server Actions
  ├── Business Logic
  ├── Matching Engine
  └── Assessment Orchestration
          ↓
       Supabase
       ├── PostgreSQL
       ├── Auth
       ├── Storage
       └── Row Level Security

GitHub
  ├── Source Code
  ├── Tests / CI
  ├── Supabase Migrations
  └── GitHub Actions
       ├── World Bank Sync
       ├── BPPA/e-GP Sync
       └── Scheduled Maintenance
```

MVP architecture rule:

> Do not add another infrastructure platform, backend framework, database, cache, search service, or microservice unless an actual measured limitation requires it.

Specifically, the MVP does **not** require:

```text
AWS
Cloudflare hosting/workers
Firebase
Express/NestJS backend
Redis
Elasticsearch
Docker/Kubernetes
microservices
separate job infrastructure
```

Keep application architecture portable by isolating Supabase access behind repository/service layers rather than placing database calls throughout UI components.

Recommended application dependency direction:

```text
UI
 ↓
Service / Use Case
 ↓
Repository
 ↓
Supabase
```

This keeps the MVP simple while allowing future infrastructure changes without rewriting the product.

The architecture must optimize for:

- low cost,
- solo-founder maintainability,
- simple deployment,
- PostgreSQL portability,
- minimal DevOps,
- ability to scale later without a rewrite.

## 8.1 Recommended MVP stack

### Web application

**Next.js + TypeScript**

Use:

- Next.js App Router,
- React,
- server components where useful,
- route handlers/server actions for backend actions,
- Tailwind CSS,
- shadcn/ui or another lightweight component library.

### Database / Auth / Storage

**Supabase**

Use it for:

- PostgreSQL,
- authentication,
- Row Level Security,
- file storage,
- database functions/triggers when appropriate.

Do not tightly couple business logic to Supabase-specific APIs where normal SQL/TypeScript code can be used.

### Hosting

**Vercel**

Vercel is the single hosting/deployment platform for the TenderSense MVP.

Responsibilities:

- host the Next.js application,
- deploy preview environments,
- deploy production from the GitHub `main` branch,
- run Next.js server-side routes/actions where required.

Do not introduce Cloudflare, AWS, Firebase, a separate Express server, or another application-hosting provider during the MVP unless a verified technical limitation requires it.

### Source Control, CI/CD, and Scheduled Ingestion

**GitHub**

GitHub is the single repository and automation platform for the MVP.

Use it for:

- source control,
- pull requests,
- issue tracking if needed,
- CI tests,
- database migration files,
- deployment integration with Vercel,
- scheduled procurement-source ingestion through GitHub Actions.

**GitHub Actions cron jobs** are the default scheduler for:

- World Bank synchronization,
- BPPA/e-GP synchronization,
- match recomputation,
- scheduled maintenance jobs that do not need to run inside the user request cycle.

Reasons:

- no separate server,
- simple logs,
- manual reruns,
- repository-versioned workflows,
- appropriate for a solo-founder MVP.

Do not introduce a separate queue, worker service, or cron provider during the MVP unless GitHub Actions becomes a demonstrated bottleneck.

### Email

**Resend**

Use only for:

- signup email if needed,
- daily digest for Pro,
- critical amendment/deadline notifications.

Do not build custom SMTP infrastructure.

### AI

Create a provider abstraction.

```ts
interface AIProvider {
  summarizeOpportunity(input: OpportunityAIInput): Promise<OpportunitySummary>;
  extractRequirements(input: RequirementExtractionInput): Promise<ExtractedRequirement[]>;
  explainMatch(input: MatchExplanationInput): Promise<MatchExplanation>;
}
```

Supported implementation choices:

1. deterministic/no-AI provider,
2. OpenAI or another explicitly selected model provider,
3. future model provider through the same abstraction.

AI provider choice is independent of the core infrastructure stack and must not introduce an additional application-hosting dependency.

**Important:** No core workflow may fail just because the AI provider is unavailable.

---

# 9. Cost Strategy

## 9.1 Target operating cost for pilot

Goal:

```text
$0–$10/month excluding optional AI tokens and domain registration
```

Possible initial setup:

- Vercel: free/lowest suitable plan during MVP,
- Supabase Free: $0,
- GitHub Actions within available free quota: $0,
- Resend Free: $0,
- AI disabled or usage kept within a separately controlled low-cost budget,
- domain: existing or low annual cost.

The MVP infrastructure must remain centered on four core platforms:

```text
Next.js + TypeScript
Supabase
Vercel
GitHub
```

No additional infrastructure platform should be introduced without a concrete requirement.

## 9.2 Do not store everything

Storage costs are controlled by storing:

- normalized tender fields,
- selected raw payload,
- hash/version history,
- user-uploaded evidence documents,
- optionally extracted text.

Do **not** mirror every procurement PDF by default.

Prefer storing:

```text
source URL
document metadata
content hash
extracted text only when needed
```

Download/store a source document only when:

- license/terms allow it,
- required for assessment,
- a user explicitly requests analysis,
- the file is unlikely to remain accessible and caching is permitted.

---

# 10. External Procurement Sources

# 10.1 World Bank — MVP Source 1

## Official source

World Bank Procurement Notice dataset.

Dataset ID:

```text
DS00979
```

Resource ID:

```text
RS00909
```

Official API endpoint:

```text
https://datacatalogapi.worldbank.org/dexapps/fone/api/apiservice
```

Base query:

```text
?datasetId=DS00979
&resourceId=RS00909
&type=json
```

The API supports `top` and `skip`.

Maximum documented page size:

```text
1000
```

Example:

```http
GET https://datacatalogapi.worldbank.org/dexapps/fone/api/apiservice?datasetId=DS00979&resourceId=RS00909&top=1000&skip=0&type=json
```

Useful fields documented by World Bank:

```text
id
bid_description
country_code
country_name
deadline_date
notice_type
procurement_category
procurement_method
project_id
publication_date
region
sector
url
publication___fiscal_year
publication___calendar_year
```

The dataset is updated daily.

### World Bank ingestion strategy

Do not fetch the entire historical dataset every day.

Initial seed:

```text
publication_date >= configurable historical date
```

Recommended pilot seed window:

```text
90–180 days
```

Incremental job:

```text
fetch records published/updated since last successful sync
```

If API filtering behaves inconsistently:

1. request pages ordered by recent data if supported,
2. stop once fetched records are older than the sync watermark,
3. deduplicate by source + external_id.

### World Bank adapter contract

```ts
export interface ProcurementSourceAdapter {
  sourceKey: string;

  fetchPage(cursor?: SourceCursor): Promise<SourcePage>;

  normalize(record: unknown): Promise<NormalizedOpportunity>;

  fetchDetails?(record: SourceRecord): Promise<SourceDetail>;

  healthCheck(): Promise<SourceHealth>;
}
```

### World Bank deduplication key

Primary:

```text
WORLD_BANK:{id}
```

Fallback:

```text
sha256(project_id + notice_type + publication_date + bid_description)
```

---

# 10.2 Bangladesh e-GP / BPPA — MVP Source 2

## Important implementation rule

TenderSense must only ingest publicly available procurement information.

Never:

- automate a registered user login,
- reuse user credentials,
- bypass CAPTCHA,
- simulate bid submission,
- purchase tender documents automatically,
- scrape private dashboards,
- bypass access controls.

## Candidate public pages

Public portal:

```text
https://www.eprocure.gov.bd/
```

Public eTender/eProposal results:

```text
https://www.eprocure.gov.bd/resources/common/StdTenderSearch.jsp?h=t
```

BPPA public advertisements:

```text
https://www.bppa.gov.bd/advertisement-notices.html
```

BPPA tender search:

```text
https://www.bppa.gov.bd/advertisement-notices/notice-search.html
```

Public categories include:

```text
Goods
Works
Services
Physical Service
```

The public e-GP search result structure currently exposes fields such as:

```text
Tender/Proposal ID
Reference No
Public Status
Procurement Nature
Title
Ministry
Division
Organization
PE Type
Method
Publishing Date and Time
Closing Date and Time
```

## RSS

The portal exposes Daily Feed and Weekly Feed links.

At the time this SOT was prepared, the linked XML endpoints returned `404`, so RSS must be treated as an optional adapter and not the only ingestion mechanism.

The system should automatically disable an RSS adapter when:

```text
3 consecutive fetches fail
```

and log a source-health warning.

## Recommended Bangladesh ingestion order

### Phase A — safest MVP

Use BPPA public advertisement/search pages.

Reason:

- public,
- no authenticated workflow,
- tender cards can link users back to the official page.

### Phase B

Use public e-GP search results to improve coverage/fields.

### Phase C

Ask BPPA for an official/public data feed or API before increasing scraping volume.

## Scraping rules

The scraper must:

- identify itself with a descriptive user agent,
- use low frequency,
- cache responses,
- retry with exponential backoff,
- never exceed a conservative request rate,
- never circumvent blocking,
- respect portal terms and applicable policies,
- stop automatically if markup changes significantly.

Recommended request policy:

```text
1 concurrent request per source
minimum 2–5 seconds between detail-page requests
maximum 3 retries
timeouts 20–30 seconds
daily/incremental crawl rather than continuous crawling
```

## User agent

Example:

```text
TenderSenseBot/0.1 (+https://tendersense.example; contact=owner@example.com)
```

Replace with real product domain/contact before production.

## Parsing strategy

Prefer server-rendered HTML using:

```text
fetch + Cheerio
```

Only use Playwright when public content cannot be obtained without browser rendering.

Do not use Playwright simply because it is convenient. It is slower, more fragile, and more expensive in CI.

## Bangladesh source identity

Primary if Tender ID is available:

```text
BD_EGP:{tender_id}
```

Fallback:

```text
sha256(reference_no + organization + closing_date + title)
```

## Handling modified notices

Store:

```text
source_updated_at
content_hash
last_seen_at
```

If the normalized content hash changes:

1. compare old/new fields,
2. save an `opportunity_revision`,
3. create amendment events for material changes,
4. notify affected Pro workspaces.

Material changes:

```text
deadline
title
eligibility text
procurement method
submission location
document URL
scope text
financial thresholds
security amount
```

---

# 11. Source Compliance and Attribution

Every opportunity must retain:

```text
source_key
source_name
external_id
source_url
publication_date
last_source_sync_at
```

UI must show:

```text
Source: Bangladesh e-GP / World Bank
View original notice
```

TenderSense must clearly state:

> TenderSense summarizes and analyzes public procurement information. The official procurement source remains authoritative. Users must verify deadlines, eligibility, amendments, and submission requirements on the original source before acting.

For sources with uncertain scraping/data reuse terms, the system should store the minimum data needed for discovery and redirect users to the source for authoritative details.

---

# 12. Ingestion Architecture

```text
                   ┌─────────────────────┐
                   │ Scheduled Trigger   │
                   │ GitHub Actions Cron │
                   └──────────┬──────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │ Source Adapter      │
                   │ WB / BPPA / e-GP   │
                   └──────────┬──────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │ Raw Source Record   │
                   │ + content hash      │
                   └──────────┬──────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │ Normalizer          │
                   │ canonical schema    │
                   └──────────┬──────────┘
                              │
                ┌─────────────┴──────────────┐
                ▼                            ▼
       ┌─────────────────┐         ┌─────────────────────┐
       │ Opportunity DB  │         │ Revision Detection  │
       └────────┬────────┘         └──────────┬──────────┘
                │                              │
                ▼                              ▼
       ┌─────────────────┐          ┌─────────────────────┐
       │ Matching Queue  │          │ Amendment Events    │
       └────────┬────────┘          └──────────┬──────────┘
                │                              │
                └─────────────┬────────────────┘
                              ▼
                   ┌─────────────────────┐
                   │ User Feed / Alerts  │
                   └─────────────────────┘
```

---

# 13. Ingestion Job State

Table:

```sql
source_sync_runs
```

Fields:

```text
id
source_key
started_at
finished_at
status
cursor
records_fetched
records_created
records_updated
records_unchanged
records_failed
error_summary
created_at
```

Statuses:

```text
running
success
partial
failed
```

Never update the source watermark until the run is successful or safely partial.

---

# 14. Canonical Opportunity Schema

```ts
export type OpportunityStatus =
  | "open"
  | "closed"
  | "cancelled"
  | "awarded"
  | "unknown";

export interface NormalizedOpportunity {
  sourceKey: string;
  externalId: string;
  sourceUrl: string;

  title: string;
  description?: string;

  noticeType?: string;
  procurementCategory?: string;
  procurementMethod?: string;

  countryCode?: string;
  countryName?: string;
  region?: string;
  district?: string;

  issuerName?: string;
  ministryName?: string;
  agencyName?: string;
  procuringEntityName?: string;

  projectId?: string;
  referenceNo?: string;

  sector?: string[];
  tags?: string[];

  publicationAt?: string;
  deadlineAt?: string;

  currency?: string;
  estimatedValueMin?: number;
  estimatedValueMax?: number;

  status: OpportunityStatus;

  rawLanguage?: string;
  sourceUpdatedAt?: string;

  contentHash: string;
}
```

---

# 15. Database Design

Use PostgreSQL.

All workspace-owned records must include `workspace_id`.

Use UUIDs for internal IDs.

Use external source IDs only as external references.

---

# 16. Core Database Tables

## 16.1 users

Managed by Supabase Auth.

Application profile table:

```sql
profiles
- id uuid pk references auth.users
- display_name text
- avatar_url text null
- locale text default 'en'
- timezone text default 'Asia/Dhaka'
- created_at timestamptz
- updated_at timestamptz
```

## 16.2 workspaces

```sql
workspaces
- id uuid pk
- name text
- slug text unique
- workspace_type text check ('individual','organization')
- plan text check ('free','pro')
- owner_user_id uuid
- country_code text null
- profile_completion smallint default 0
- created_at timestamptz
- updated_at timestamptz
```

## 16.3 workspace_members

```sql
workspace_members
- id uuid pk
- workspace_id uuid fk
- user_id uuid fk
- role text check ('admin','member','viewer')
- status text check ('active','invited','disabled')
- joined_at timestamptz null
- created_at timestamptz

unique(workspace_id, user_id)
```

## 16.4 workspace_invites

```sql
workspace_invites
- id uuid pk
- workspace_id uuid
- email citext
- role text
- token_hash text
- expires_at timestamptz
- accepted_at timestamptz null
- invited_by uuid
- created_at timestamptz
```

## 16.5 organization_profiles

```sql
organization_profiles
- workspace_id uuid pk
- legal_name text
- trading_name text null
- website text null
- founded_year int null
- employee_count_min int null
- employee_count_max int null
- annual_turnover_min numeric null
- annual_turnover_max numeric null
- turnover_currency text null
- summary text null
- headquarters_country text null
- registration_number text null
- tax_id text null
- profile_json jsonb default '{}'
- updated_at timestamptz
```

Do not expose sensitive registration/tax fields in feed APIs.

## 16.6 individual_profiles

```sql
individual_profiles
- workspace_id uuid pk
- headline text
- years_experience int null
- summary text null
- country_code text null
- profile_json jsonb default '{}'
- updated_at timestamptz
```

## 16.7 capabilities

Reusable capability taxonomy.

```sql
capabilities
- id uuid pk
- key text unique
- name text
- category text
- aliases text[]
```

Examples:

```text
enterprise_software
erp
hrmis
fintech
microfinance
cloud_migration
cybersecurity
managed_services
data_analytics
mobile_apps
```

## 16.8 workspace_capabilities

```sql
workspace_capabilities
- id uuid pk
- workspace_id uuid
- capability_id uuid
- proficiency smallint null
- years_experience numeric null
- notes text null
- evidence_count int default 0
- created_at timestamptz
```

## 16.9 projects

```sql
projects
- id uuid pk
- workspace_id uuid
- name text
- client_name text null
- country_code text null
- sector text null
- start_date date null
- end_date date null
- contract_value numeric null
- currency text null
- summary text
- services text[]
- technologies text[]
- is_public boolean default false
- created_at timestamptz
- updated_at timestamptz
```

## 16.10 credentials

```sql
credentials
- id uuid pk
- workspace_id uuid
- type text
- name text
- issuer text null
- credential_number text null
- issued_date date null
- expiry_date date null
- status text
- evidence_document_id uuid null
- created_at timestamptz
```

Types:

```text
certification
license
membership
accreditation
partnership
award
```

## 16.11 evidence_documents

```sql
evidence_documents
- id uuid pk
- workspace_id uuid
- uploaded_by uuid
- file_name text
- storage_path text
- mime_type text
- file_size bigint
- sha256 text
- document_type text null
- extraction_status text
- extracted_text text null
- metadata jsonb default '{}'
- created_at timestamptz
```

Do not make the storage bucket public.

Use signed URLs.

## 16.12 sources

```sql
sources
- key text pk
- name text
- base_url text
- source_type text
- enabled boolean
- ingestion_mode text
- configuration jsonb
- last_successful_sync_at timestamptz null
- created_at timestamptz
```

## 16.13 source_records

```sql
source_records
- id uuid pk
- source_key text
- external_id text
- source_url text
- payload jsonb
- content_hash text
- fetched_at timestamptz
- last_seen_at timestamptz
- parse_version int default 1

unique(source_key, external_id)
```

Keep `payload` small. Do not store large HTML blobs indefinitely.

## 16.14 opportunities

```sql
opportunities
- id uuid pk
- source_key text
- external_id text
- source_url text
- title text
- description text null
- search_text tsvector
- notice_type text null
- procurement_category text null
- procurement_method text null
- country_code text null
- country_name text null
- region text null
- district text null
- issuer_name text null
- ministry_name text null
- agency_name text null
- procuring_entity_name text null
- project_id text null
- reference_no text null
- sector text[]
- tags text[]
- publication_at timestamptz null
- deadline_at timestamptz null
- currency text null
- estimated_value_min numeric null
- estimated_value_max numeric null
- status text
- language text null
- content_hash text
- source_updated_at timestamptz null
- first_seen_at timestamptz
- last_seen_at timestamptz
- created_at timestamptz
- updated_at timestamptz

unique(source_key, external_id)
```

Recommended indexes:

```sql
create index on opportunities(deadline_at);
create index on opportunities(publication_at desc);
create index on opportunities(country_code);
create index on opportunities(source_key);
create index on opportunities(status);
create index opportunities_search_idx on opportunities using gin(search_text);
create index opportunities_sector_idx on opportunities using gin(sector);
create index opportunities_tags_idx on opportunities using gin(tags);
```

## 16.15 opportunity_revisions

```sql
opportunity_revisions
- id uuid pk
- opportunity_id uuid
- revision_no int
- previous_hash text
- new_hash text
- changed_fields text[]
- change_snapshot jsonb
- detected_at timestamptz
```

## 16.16 monitoring_profiles

```sql
monitoring_profiles
- id uuid pk
- workspace_id uuid
- name text
- is_primary boolean
- countries text[]
- sources text[]
- services text[]
- sectors text[]
- opportunity_types text[]
- keywords text[]
- excluded_keywords text[]
- min_contract_value numeric null
- max_contract_value numeric null
- currency text null
- min_days_remaining int null
- active boolean
- created_at timestamptz
- updated_at timestamptz
```

Free restriction:

```text
max 1 active monitoring profile
```

Pro:

```text
multiple active profiles
```

## 16.17 saved_searches

```sql
saved_searches
- id uuid pk
- workspace_id uuid
- created_by uuid
- name text
- query text null
- filters jsonb
- notify boolean default false
- created_at timestamptz
```

## 16.18 opportunity_matches

Precomputed personalized scores.

```sql
opportunity_matches
- id uuid pk
- workspace_id uuid
- opportunity_id uuid
- score smallint
- confidence text
- reasons jsonb
- concerns jsonb
- scoring_version int
- computed_at timestamptz

unique(workspace_id, opportunity_id)
```

## 16.19 assessments

```sql
assessments
- id uuid pk
- workspace_id uuid
- opportunity_id uuid
- requested_by uuid
- status text
- overall_score smallint null
- strategic_fit_score smallint null
- eligibility_score smallint null
- experience_score smallint null
- credential_score smallint null
- financial_score smallint null
- preparation_score smallint null
- recommendation text null
- summary text null
- model_provider text null
- model_name text null
- prompt_version int null
- scoring_version int
- started_at timestamptz
- completed_at timestamptz null
- created_at timestamptz
```

Statuses:

```text
queued
processing
completed
failed
needs_review
```

## 16.20 assessment_requirements

```sql
assessment_requirements
- id uuid pk
- assessment_id uuid
- category text
- requirement_text text
- normalized_key text null
- status text
- confidence numeric null
- evidence_summary text null
- gap_summary text null
- source_location text null
- sort_order int
- created_at timestamptz
```

Statuses:

```text
meets
partially_meets
needs_verification
gap
not_applicable
```

## 16.21 requirement_evidence_links

```sql
requirement_evidence_links
- id uuid pk
- requirement_id uuid
- evidence_type text
- evidence_id uuid
- relevance_score numeric
- note text null
```

## 16.22 shortlist_items

```sql
shortlist_items
- id uuid pk
- workspace_id uuid
- opportunity_id uuid
- added_by uuid
- owner_user_id uuid null
- state text
- decision_due_at timestamptz null
- created_at timestamptz
- updated_at timestamptz

unique(workspace_id, opportunity_id)
```

States:

```text
shortlisted
reviewing
pursue
hold
decline
```

## 16.23 decisions

Append-only decision history.

```sql
decisions
- id uuid pk
- shortlist_item_id uuid
- workspace_id uuid
- opportunity_id uuid
- decision text
- reason_code text null
- reason_text text null
- decided_by uuid
- decided_at timestamptz
```

Never overwrite decision history.

## 16.24 notes

```sql
notes
- id uuid pk
- workspace_id uuid
- opportunity_id uuid
- author_user_id uuid
- visibility text
- body text
- created_at timestamptz
- updated_at timestamptz
```

## 16.25 comments

```sql
comments
- id uuid pk
- workspace_id uuid
- opportunity_id uuid
- author_user_id uuid
- body text
- parent_comment_id uuid null
- created_at timestamptz
- updated_at timestamptz
```

## 16.26 preparation_tasks

```sql
preparation_tasks
- id uuid pk
- workspace_id uuid
- opportunity_id uuid
- title text
- description text null
- owner_user_id uuid null
- status text
- due_at timestamptz null
- milestone text null
- requirement_id uuid null
- created_by uuid
- created_at timestamptz
- updated_at timestamptz
```

Statuses:

```text
todo
in_progress
blocked
done
```

## 16.27 notifications

```sql
notifications
- id uuid pk
- user_id uuid
- workspace_id uuid
- type text
- title text
- body text
- payload jsonb
- read_at timestamptz null
- created_at timestamptz
```

## 16.28 subscription_usage

```sql
subscription_usage
- id uuid pk
- workspace_id uuid
- usage_month date
- assessments_used int default 0
- assessments_limit int
- emails_sent int default 0
- created_at timestamptz
- updated_at timestamptz

unique(workspace_id, usage_month)
```

---

# 17. Row Level Security

RLS is mandatory.

General rule:

```text
A user may access a workspace-owned row only when an active workspace_members row exists.
```

Exceptions:

- public normalized opportunities can be readable by authenticated users,
- source raw payload must not be directly readable from client APIs,
- billing/admin metadata must be admin-only,
- private evidence documents must require membership and signed URLs.

Example pattern:

```sql
exists (
  select 1
  from workspace_members wm
  where wm.workspace_id = target.workspace_id
    and wm.user_id = auth.uid()
    and wm.status = 'active'
)
```

Admin-only actions:

```text
workspace billing
member removal
plan settings
workspace deletion
sensitive company information
```

---

# 18. Search Architecture

Start with PostgreSQL full-text search.

No Elasticsearch/Algolia for MVP.

Create weighted `tsvector` from:

```text
title         weight A
description   weight B
issuer        weight B
sector        weight B
tags          weight B
reference no  weight C
```

Support filters:

```text
source
country
notice type
procurement category
procurement method
publication date
deadline range
days remaining
sector
match score
status
```

Later add semantic/vector search only if evidence shows users need it.

---

# 19. Matching Engine

Basic personalized matching must not use an LLM.

Reason:

- cheap,
- explainable,
- fast,
- repeatable.

## 19.1 Score scale

```text
0–100
```

Suggested labels:

```text
85–100  Strong Match
70–84   Good Match
50–69   Potential Match
0–49    Low Match
```

## 19.2 Initial weighted model

```text
service/capability match       30
sector match                   15
country/market match           10
source preference               5
opportunity type preference     5
keyword similarity             15
past project similarity        10
credential signal               5
timeline suitability            5
                              ----
                              100
```

For Free users without project/evidence data, redistribute unavailable weights proportionally.

## 19.3 Negative signals

Examples:

```text
excluded keyword
excluded country
deadline already closed
insufficient minimum days remaining
known mandatory certification missing
known value outside preferred range
```

Negative signals should reduce score but not silently hide an opportunity unless the user explicitly configured an exclusion.

## 19.4 Explainability

Store reasons as structured JSON:

```json
{
  "positive": [
    {
      "type": "capability",
      "label": "ERP implementation",
      "weight": 18,
      "evidence": "Workspace capability"
    },
    {
      "type": "sector",
      "label": "Government ICT",
      "weight": 12
    }
  ],
  "negative": [
    {
      "type": "timeline",
      "label": "Only 8 days remain",
      "weight": -4
    }
  ]
}
```

Do not generate matching explanations from scratch every time the page loads.

---

# 20. Detailed Assessment Engine

A detailed assessment is a deliberate action.

It consumes the monthly assessment quota.

Flow:

```text
User clicks Run Assessment
        ↓
Check entitlement / usage
        ↓
Create assessment record
        ↓
Gather opportunity data
        ↓
Gather source/detail text
        ↓
Extract requirements
        ↓
Retrieve workspace evidence
        ↓
Evaluate requirement-by-requirement
        ↓
Compute category scores
        ↓
Generate concise recommendation
        ↓
Save assessment
        ↓
Increment usage
```

Only increment usage after the assessment successfully reaches a meaningful result.

If the AI provider fails completely:

```text
mark failed
do not charge usage
allow retry
```

---

# 21. Requirement Extraction

Categories:

```text
legal
financial
technical
experience
personnel
certification
geography
documentation
submission
security
other
```

Each extracted requirement must include:

```json
{
  "category": "experience",
  "text": "Bidder must have completed at least three similar ERP implementations in the last five years.",
  "normalizedKey": "similar_erp_projects_5y",
  "mandatory": true,
  "threshold": {
    "operator": ">=",
    "value": 3,
    "unit": "projects"
  },
  "sourceLocation": "Eligibility section, paragraph 4",
  "confidence": 0.91
}
```

Never allow an LLM-generated requirement to become authoritative without showing the source text/location when available.

---

# 22. Eligibility Evaluation

Status set:

```text
meets
partially_meets
needs_verification
gap
not_applicable
```

Rules:

### Meets

Evidence clearly satisfies requirement.

### Partially meets

Evidence exists but does not clearly satisfy the full threshold.

### Needs verification

Potential evidence exists but data is missing/ambiguous.

### Gap

Available profile information indicates the requirement is not satisfied.

### Not applicable

Requirement does not apply to the workspace or is informational.

Important:

> Unknown must never automatically become Gap.

Use `needs_verification` when data is missing.

---

# 23. Assessment Scoring

Suggested categories:

```text
Strategic Fit
Eligibility
Experience
Credentials
Financial
Preparation
```

Do not create a false sense of certainty.

Display:

```text
score + confidence + unresolved items
```

Example:

```text
Eligibility: 78%
Confidence: Medium
3 requirements need verification
```

Possible overall formula:

```text
strategic_fit       20%
eligibility         30%
experience          20%
credentials         10%
financial           10%
preparation         10%
```

If a category is unknown, do not assign zero; normalize across known categories and show confidence reduction.

---

# 24. Recommendation Logic

Possible recommendations:

```text
Strong Pursue
Potential Pursue
Needs Review
High Risk
Likely Decline
```

Do not automatically change the user's actual decision.

The recommendation is system guidance.

The decision is human-owned:

```text
Pursue
Hold
Decline
```

---

# 25. Preparation Window

Compute:

```text
days_remaining = deadline - current_date
```

Suggested label:

```text
>30 days     Healthy
15–30 days   Manageable
8–14 days    Tight
1–7 days     Critical
<=0          Closed
```

Later this may be adjusted based on tender complexity.

MVP can use the simple model.

---

# 26. Amendment Detection

Every ingestion update compares:

```text
old normalized hash
new normalized hash
```

If changed:

1. diff material fields,
2. save revision,
3. update opportunity,
4. find Pro workspaces where opportunity is shortlisted or highly matched,
5. create in-app notification,
6. optionally send email if change is critical.

Critical change:

```text
deadline changed
notice cancelled
mandatory requirement changed
major document added
submission instructions changed
```

---

# 27. API Design

Use internal REST-style route handlers.

Prefix:

```text
/api/v1
```

Do not expose source-adapter/admin endpoints to normal clients.

---

# 28. Auth APIs

Supabase handles core auth.

Application endpoints:

```http
POST /api/v1/workspaces
GET  /api/v1/workspaces/:workspaceId
PATCH /api/v1/workspaces/:workspaceId
```

---

# 29. Profile APIs

```http
GET   /api/v1/workspaces/:workspaceId/profile
PATCH /api/v1/workspaces/:workspaceId/profile

GET   /api/v1/workspaces/:workspaceId/capabilities
POST  /api/v1/workspaces/:workspaceId/capabilities
DELETE /api/v1/workspaces/:workspaceId/capabilities/:id

GET   /api/v1/workspaces/:workspaceId/projects
POST  /api/v1/workspaces/:workspaceId/projects
PATCH /api/v1/workspaces/:workspaceId/projects/:id
DELETE /api/v1/workspaces/:workspaceId/projects/:id

GET   /api/v1/workspaces/:workspaceId/credentials
POST  /api/v1/workspaces/:workspaceId/credentials
PATCH /api/v1/workspaces/:workspaceId/credentials/:id
DELETE /api/v1/workspaces/:workspaceId/credentials/:id
```

---

# 30. Evidence APIs

```http
POST /api/v1/workspaces/:workspaceId/documents/presign
POST /api/v1/workspaces/:workspaceId/documents/complete
GET  /api/v1/workspaces/:workspaceId/documents
GET  /api/v1/workspaces/:workspaceId/documents/:id
DELETE /api/v1/workspaces/:workspaceId/documents/:id
```

Upload validation:

```text
allowed MIME types
maximum file size
virus/malware scan later
sha256 hash
private bucket
```

Suggested MVP types:

```text
application/pdf
application/vnd.openxmlformats-officedocument.wordprocessingml.document
image/jpeg
image/png
```

PDF preferred for extraction.

---

# 31. Opportunity APIs

```http
GET /api/v1/opportunities
GET /api/v1/opportunities/:id
GET /api/v1/opportunities/:id/revisions
```

Query example:

```http
GET /api/v1/opportunities?country=BD&source=world_bank&minDays=14&sort=match_desc&page=1
```

Response should include workspace-specific match only when a workspace context is provided and user belongs to it.

---

# 32. Match APIs

```http
GET  /api/v1/workspaces/:workspaceId/opportunities/:opportunityId/match
POST /api/v1/workspaces/:workspaceId/matches/recompute
```

Recompute endpoint admin/background only for bulk requests.

---

# 33. Assessment APIs

```http
POST /api/v1/workspaces/:workspaceId/opportunities/:opportunityId/assessments
GET  /api/v1/workspaces/:workspaceId/opportunities/:opportunityId/assessments/latest
GET  /api/v1/workspaces/:workspaceId/assessments/:assessmentId
POST /api/v1/workspaces/:workspaceId/assessments/:assessmentId/retry
```

Create response:

```json
{
  "assessmentId": "...",
  "status": "queued",
  "usage": {
    "used": 12,
    "limit": 100
  }
}
```

---

# 34. Shortlist APIs

```http
GET    /api/v1/workspaces/:workspaceId/shortlist
POST   /api/v1/workspaces/:workspaceId/shortlist
PATCH  /api/v1/workspaces/:workspaceId/shortlist/:id
DELETE /api/v1/workspaces/:workspaceId/shortlist/:id
```

---

# 35. Decision APIs

```http
POST /api/v1/workspaces/:workspaceId/shortlist/:id/decisions
GET  /api/v1/workspaces/:workspaceId/shortlist/:id/decisions
```

POST body:

```json
{
  "decision": "pursue",
  "reasonCode": "strong_fit",
  "reasonText": "Strong government ERP experience; financial threshold verified."
}
```

---

# 36. Task APIs

```http
GET   /api/v1/workspaces/:workspaceId/opportunities/:id/tasks
POST  /api/v1/workspaces/:workspaceId/opportunities/:id/tasks
PATCH /api/v1/workspaces/:workspaceId/tasks/:taskId
DELETE /api/v1/workspaces/:workspaceId/tasks/:taskId
```

---

# 37. Monitoring APIs

```http
GET    /api/v1/workspaces/:workspaceId/monitoring
POST   /api/v1/workspaces/:workspaceId/monitoring
PATCH  /api/v1/workspaces/:workspaceId/monitoring/:id
DELETE /api/v1/workspaces/:workspaceId/monitoring/:id
```

Free plan validator:

```text
reject creation if active monitoring profile already exists
```

---

# 38. Notification APIs

```http
GET  /api/v1/notifications
POST /api/v1/notifications/:id/read
POST /api/v1/notifications/read-all
```

---

# 39. Team APIs

```http
GET    /api/v1/workspaces/:workspaceId/members
POST   /api/v1/workspaces/:workspaceId/invites
DELETE /api/v1/workspaces/:workspaceId/invites/:id
PATCH  /api/v1/workspaces/:workspaceId/members/:id
DELETE /api/v1/workspaces/:workspaceId/members/:id
```

Plan limits enforced server-side.

---

# 40. Reports APIs

```http
GET /api/v1/workspaces/:workspaceId/reports/pipeline
GET /api/v1/workspaces/:workspaceId/reports/decisions
GET /api/v1/workspaces/:workspaceId/reports/sources
GET /api/v1/workspaces/:workspaceId/reports/export
```

MVP reports should be direct SQL aggregates.

Do not create a data warehouse.

---

# 41. Source/Admin APIs

Never expose to standard users.

```http
POST /api/internal/sources/:sourceKey/sync
GET  /api/internal/sources/health
POST /api/internal/opportunities/:id/reprocess
```

Protect with:

```text
server-to-server secret
```

Prefer running ingestion scripts directly rather than public HTTP if possible.

---

# 42. Feature Gating

All feature gates must be server-authoritative.

Do not only hide buttons in UI.

Example capability function:

```ts
type Feature =
  | "team"
  | "documents"
  | "advanced_filters"
  | "saved_searches"
  | "daily_digest"
  | "amendment_alerts"
  | "shared_shortlist"
  | "tasks"
  | "reports";

export function canUseFeature(plan: Plan, feature: Feature): boolean {
  const proOnly: Feature[] = [
    "team",
    "documents",
    "advanced_filters",
    "saved_searches",
    "daily_digest",
    "amendment_alerts",
    "shared_shortlist",
    "tasks",
    "reports",
  ];

  return plan === "pro" || !proOnly.includes(feature);
}
```

Assessment limits:

```text
Free: 5/month
Pro: 100/month
```

Store the value in plan configuration rather than scattering magic numbers across code.

---

# 43. Plan Configuration

```ts
export const PLAN_LIMITS = {
  free: {
    users: 1,
    monitoringProfiles: 1,
    assessmentsPerMonth: 5,
    documents: false,
    dailyDigest: false,
  },
  pro: {
    users: 5,
    monitoringProfiles: 20,
    assessmentsPerMonth: 100,
    documents: true,
    dailyDigest: true,
  },
} as const;
```

---

# 44. Onboarding Flow

## Step 1 — Signup

```text
Email/password or Google
```

## Step 2 — Choose workspace type

```text
I am looking for opportunities for:
[ Myself ]
[ An organization ]
```

## Step 3 — Basic profile

### Individual

```text
Name
Country
Expertise
Services
Industries
Years experience
Preferred markets
```

### Organization

```text
Organization name
Country
Website optional
Services
Industries
Markets
Company size optional
```

## Step 4 — Monitoring preferences

Ask only high-value fields:

```text
countries
sources
services
sectors
opportunity types
keywords
minimum days remaining
```

## Step 5 — Initial feed

Do not force the user to complete a perfect profile.

Show:

```text
Profile 45% complete
Your feed is ready
```

## Step 6 — Progressive profiling

Prompt users later:

```text
Add past projects to improve experience matching.
Add certifications to improve eligibility checking.
```

Pro may upload evidence documents.

---

# 45. Home Experience

Home must answer:

> What deserves my attention now?

Sections:

```text
Recommended for you
New since your last visit
Needs attention
Upcoming deadlines
Recent amendments
Assessment usage
```

Free users:

- recommendations,
- new opportunities,
- deadline overview,
- assessment usage.

Pro:

- team decisions,
- amendments,
- tasks,
- owner/decision deadlines.

---

# 46. Opportunity Card

Minimum fields:

```text
source
title
issuer
country
notice type
deadline
days remaining
match score
top 2–3 reasons
one concern if important
shortlist action
```

Example:

```text
World Bank

Digital Government ERP Implementation

89% Strong Match

Bangladesh • RFP • ICT
Deadline: 17 Oct • 36 days

✓ ERP implementation
✓ Government sector
! Turnover threshold needs review

[View] [Shortlist]
```

---

# 47. Opportunity Detail

Sections:

```text
Summary
Key Facts
Why It Matches
Eligibility
Requirements
Timeline
Documents
Official Source
```

Sticky actions:

```text
Shortlist
Run Assessment
View Official Source
```

---

# 48. Detailed Assessment UX

Header:

```text
Overall qualification: 82%
Confidence: Medium
Recommendation: Potential Pursue
```

Category cards:

```text
Strategic Fit
Eligibility
Experience
Credentials
Financial
Preparation
```

Requirement table:

```text
Requirement | Status | Evidence | Action
```

Never display a score without supporting reasons.

---

# 49. Shortlist Workflow

```text
Shortlisted
    ↓
Reviewing
    ↓
Pursue / Hold / Decline
```

No more workflow states for MVP.

---

# 50. Pro Preparation

Lightweight only.

Display:

```text
requirements completed / total
tasks
owners
due dates
internal milestones
```

Default milestones:

```text
Eligibility review
Management decision
Partner confirmation
Technical preparation
Commercial preparation
Final review
Submission
```

Milestones are internal guidance only.

---

# 51. Notifications

Types:

```text
new_match
deadline_approaching
deadline_changed
amendment_detected
assessment_completed
decision_due
task_due
team_comment
usage_warning
```

Channels:

```text
in_app
email
```

MVP rule:

- all users receive in-app,
- Pro may enable daily digest,
- critical deadline/amendment may send immediate email.

Avoid noisy notification spam.

---

# 52. Daily Digest

One email per active Pro user.

Sections:

```text
New strong matches
Changed deadlines
Important amendments
Decisions due
Upcoming deadlines
```

Digest should link directly into TenderSense.

---

# 53. Free User Stories

## F-01 Signup

**As an individual**, I want to create an account so I can receive personalized tender opportunities.

Acceptance criteria:

- user can register,
- personal workspace is created,
- user becomes workspace admin,
- Free plan applied.

## F-02 Organization Free signup

**As a small organization**, I want to create an organization workspace so matching uses company capabilities.

Acceptance criteria:

- workspace type organization,
- one user maximum,
- profile can be manually edited.

## F-03 Define interests

**As a user**, I want to select countries, services, and procurement sources so my feed is relevant.

Acceptance criteria:

- one monitoring profile,
- preferences saved,
- feed changes after save.

## F-04 Browse opportunities

**As a user**, I want to browse supported public opportunities so I do not need to monitor each portal manually.

Acceptance criteria:

- paginated list,
- filter by supported free filters,
- original source visible.

## F-05 Personalized match

**As a user**, I want to know why an opportunity matches me so I can quickly judge relevance.

Acceptance criteria:

- score,
- label,
- minimum one matching reason when available,
- concerns shown separately.

## F-06 Search

**As a user**, I want to search by service or keyword so I can find specific opportunities.

Acceptance criteria:

- title/description/issuer search,
- pagination,
- search term retained in URL.

## F-07 Bookmark

**As a user**, I want to shortlist a tender so I can review it later.

Acceptance criteria:

- shortlist toggle,
- saved per workspace,
- no duplicate shortlist rows.

## F-08 Personal note

**As a Free user**, I want to add a note so I can remember why a tender matters.

Acceptance criteria:

- note private to workspace,
- edit/delete supported.

## F-09 Run assessment

**As a Free user**, I want a detailed assessment so I can evaluate eligibility.

Acceptance criteria:

- remaining quota displayed before action,
- successful assessment decrements quota,
- max 5/month,
- failed run does not consume quota.

## F-10 Source verification

**As a user**, I want to open the official notice so I can verify TenderSense information.

Acceptance criteria:

- official URL always visible if source provides it,
- opens safely in new tab.

---

# 54. Pro User Stories

## P-01 Invite team

**As an admin**, I want to invite teammates so we can evaluate tenders together.

Acceptance criteria:

- up to five included active users,
- email invite,
- role assignment,
- expired tokens rejected.

## P-02 Upload company evidence

**As an admin/member**, I want to upload credentials and project evidence so assessments can use real company data.

Acceptance criteria:

- private storage,
- allowed files validated,
- document associated with workspace,
- extracted text is not public.

## P-03 Add projects

**As a team member**, I want to add historical projects so TenderSense can identify experience matches.

Acceptance criteria:

- client/project summary,
- sector/country/services,
- optional contract value,
- used in assessment retrieval.

## P-04 Advanced monitoring

**As a team**, I want multiple monitoring profiles so different opportunity strategies can be tracked.

Acceptance criteria:

- create/activate/deactivate profiles,
- names unique within workspace where practical.

## P-05 Detailed assessment

**As a member**, I want detailed eligibility and evidence mapping so I can identify gaps quickly.

Acceptance criteria:

- requirement list,
- eligibility status,
- linked evidence,
- confidence,
- unresolved items.

## P-06 Shared shortlist

**As a team**, I want everyone to see the same shortlist so we avoid duplicate evaluation.

Acceptance criteria:

- workspace-shared,
- owner assignment,
- state visible,
- audit activity.

## P-07 Decision

**As an authorized member**, I want to record Pursue/Hold/Decline with a reason.

Acceptance criteria:

- append-only decision record,
- current shortlist state updated,
- decision history preserved.

## P-08 Assign owner

**As a team lead**, I want to assign an opportunity owner so someone is accountable.

Acceptance criteria:

- active workspace member only,
- reassignment logged.

## P-09 Tasks

**As a team member**, I want to create preparation tasks so the team knows what must happen next.

Acceptance criteria:

- owner,
- due date,
- status,
- optional link to requirement.

## P-10 Amendment alert

**As a shortlisted-opportunity owner**, I want to know when a deadline or material requirement changes.

Acceptance criteria:

- revision detected,
- in-app notification,
- email if enabled/critical,
- before/after change visible.

## P-11 Daily digest

**As a Pro user**, I want a daily summary so I do not need to repeatedly visit every source.

Acceptance criteria:

- maximum one daily digest,
- only relevant active data,
- unsubscribe/disable option.

## P-12 Report

**As a manager**, I want to see opportunity and decision metrics so I can understand tender pipeline activity.

Acceptance criteria:

- totals,
- shortlist by state,
- source distribution,
- decision counts,
- date range.

---

# 55. BRAC IT Pilot Journey

## Persona A — Tender/Business Development Lead

Goal:

```text
Find relevant ICT opportunities early and decide what the team should assess.
```

Journey:

1. signs into BRAC IT workspace,
2. checks Home,
3. sees new Strong Matches,
4. opens a government/World Bank opportunity,
5. reviews match reasons,
6. shortlists,
7. runs assessment,
8. sees eligibility gaps,
9. assigns owner,
10. sets decision date.

## Persona B — Evaluator / BA / Domain Expert

Goal:

```text
Verify eligibility and supporting evidence.
```

Journey:

1. opens assigned opportunity,
2. reviews extracted requirements,
3. checks mapped BRAC IT projects/credentials,
4. marks ambiguous requirements for verification,
5. comments,
6. uploads/adds missing evidence,
7. assessment updates.

## Persona C — Decision Maker

Goal:

```text
Make fast bid/no-bid decisions with enough evidence.
```

Journey:

1. receives decision-due notification,
2. opens assessment summary,
3. reviews major strengths/gaps,
4. checks preparation time,
5. chooses Pursue/Hold/Decline,
6. provides decision reason.

## Persona D — Opportunity Owner

Goal:

```text
Coordinate early preparation after Pursue.
```

Journey:

1. receives ownership,
2. reviews requirement checklist,
3. creates tasks,
4. assigns owners,
5. monitors milestones,
6. verifies official source before final submission preparation outside TenderSense.

---

# 56. BRAC IT Pilot Data Setup

Initial organization profile should include:

```text
Core services
Target sectors
Technology capabilities
Government/financial-sector experience
Major projects
Relevant certifications
Country experience
Preferred procurement sources
Preferred opportunity types
Minimum preparation window
```

Do not attempt to fully model BRAC IT on day one.

Start with 10–20 representative capabilities/projects and improve iteratively.

---

# 57. Profile Completeness

Compute a simple weighted completeness value.

Organization example:

```text
basic information          10%
services/capabilities      20%
sectors/markets            10%
projects                   25%
credentials                15%
financial information      10%
monitoring preferences     10%
```

Display suggestions:

```text
Add 3 past projects → improve experience matching
Add ISO certificates → improve eligibility checking
Add financial range → improve turnover qualification
```

---

# 58. Evidence Extraction

MVP extraction pipeline:

```text
upload
  ↓
validate
  ↓
store private file
  ↓
extract plain text
  ↓
classify document
  ↓
optionally use AI to suggest structured facts
  ↓
user confirms important facts
```

Do not silently trust extracted company facts.

For important eligibility facts:

```text
AI suggested
User confirmed
```

Track provenance.

---

# 59. Provenance Model

Any important structured fact derived from a document should optionally store:

```text
source_document_id
page_number
source_excerpt
extraction_method
confidence
confirmed_by_user
confirmed_at
```

This is essential for future explainability.

---

# 60. AI Usage Rules

## AI should be used for

- concise opportunity summary,
- requirement extraction from long unstructured text,
- classification,
- natural-language match explanation,
- document fact suggestions.

## AI should not control

- source truth,
- permissions,
- billing,
- plan limits,
- deadlines,
- user decisions,
- source IDs,
- authorization,
- database integrity.

## AI output format

Always use structured output/schema validation.

Example:

```ts
const RequirementSchema = z.object({
  category: z.enum([
    "legal",
    "financial",
    "technical",
    "experience",
    "personnel",
    "certification",
    "geography",
    "documentation",
    "submission",
    "security",
    "other",
  ]),
  requirementText: z.string(),
  mandatory: z.boolean().nullable(),
  sourceLocation: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});
```

Never directly persist unvalidated model JSON.

---

# 61. Prompt Versioning

Store:

```text
prompt_version
model_provider
model_name
timestamp
```

Prompts should be files in the repository:

```text
/prompts
  opportunity-summary.v1.md
  requirement-extraction.v1.md
  match-explanation.v1.md
```

Do not hardcode large prompts inside UI components.

---

# 62. Example Requirement Extraction Prompt Contract

System objective:

```text
Extract only procurement requirements explicitly supported by the supplied source text.
Do not invent thresholds.
Distinguish mandatory requirements from descriptive information.
When uncertain, set mandatory=null and reduce confidence.
Return source location when available.
```

Input:

```text
opportunity metadata
source text
```

Output:

```json
{
  "requirements": []
}
```

---

# 63. AI Cost Controls

Before sending text to a model:

1. remove navigation/footer boilerplate,
2. deduplicate repeated text,
3. truncate irrelevant sections,
4. use deterministic parsers for obvious structured fields,
5. cache model result by input hash,
6. never summarize the same unchanged notice twice.

Cache key:

```text
sha256(task_type + model + prompt_version + input_hash)
```

Table:

```sql
ai_cache
- cache_key text pk
- task_type text
- provider text
- model text
- response jsonb
- created_at timestamptz
```

---

# 64. Optional Embeddings

Embeddings are not required for MVP launch.

If added later:

- embed capability/project summaries,
- embed opportunity description/requirements,
- use PostgreSQL `pgvector`,
- retrieve top relevant evidence before assessment.

Do not create an external vector database for MVP.

---

# 65. File/Document Processing

Recommended libraries:

```text
PDF text: pdf-parse or server-side PDF extraction library
DOCX: mammoth
HTML: Cheerio
```

If a PDF is scanned/image-only:

MVP behavior:

```text
show "Text could not be extracted reliably. Please add structured details manually."
```

OCR can be added later.

Do not make OCR a launch blocker.

---

# 66. Repository Structure

Recommended monorepo/simple repository:

```text
tendersense/
├── app/
│   ├── (auth)/
│   ├── (app)/
│   │   ├── home/
│   │   ├── discover/
│   │   ├── shortlist/
│   │   ├── workspace/
│   │   ├── reports/
│   │   └── settings/
│   └── api/
│       └── v1/
│
├── components/
│   ├── ui/
│   ├── opportunities/
│   ├── assessments/
│   ├── workspace/
│   └── shortlist/
│
├── lib/
│   ├── auth/
│   ├── db/
│   ├── entitlements/
│   ├── matching/
│   ├── assessments/
│   ├── notifications/
│   ├── ai/
│   └── sources/
│       ├── adapter.ts
│       ├── world-bank/
│       └── bppa/
│
├── scripts/
│   ├── sync-world-bank.ts
│   ├── sync-bppa.ts
│   ├── recompute-matches.ts
│   └── send-digests.ts
│
├── prompts/
├── supabase/
│   ├── migrations/
│   └── seed.sql
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
└── .github/
    └── workflows/
        ├── sync-world-bank.yml
        ├── sync-bppa.yml
        └── daily-digest.yml
```

---

# 67. Source Adapter Structure

```ts
export type SourceCursor = {
  offset?: number;
  publishedAfter?: string;
  token?: string;
};

export type SourcePage = {
  records: unknown[];
  nextCursor?: SourceCursor;
  hasMore: boolean;
};

export interface ProcurementSourceAdapter {
  sourceKey: string;
  fetchPage(cursor?: SourceCursor): Promise<SourcePage>;
  getExternalId(record: unknown): string;
  normalize(record: unknown): Promise<NormalizedOpportunity>;
  healthCheck(): Promise<{
    ok: boolean;
    message?: string;
  }>;
}
```

Do not put source-specific parsing logic inside shared opportunity services.

---

# 68. World Bank Sync Pseudocode

```ts
async function syncWorldBank() {
  const source = worldBankAdapter;
  let cursor = await getResumeCursor(source.sourceKey);
  let done = false;

  while (!done) {
    const page = await source.fetchPage(cursor);

    for (const raw of page.records) {
      const externalId = source.getExternalId(raw);
      const normalized = await source.normalize(raw);

      await upsertSourceRecord({
        sourceKey: source.sourceKey,
        externalId,
        payload: minimizeRawPayload(raw),
        contentHash: hash(raw),
      });

      await upsertOpportunity(normalized);
    }

    cursor = page.nextCursor;
    done = !page.hasMore;
  }

  await markSourceSyncSuccessful(source.sourceKey);
}
```

---

# 69. BPPA/e-GP Sync Pseudocode

```ts
async function syncBppa() {
  const listPages = await fetchCurrentAdvertisementPages();

  for (const page of listPages) {
    const records = parseAdvertisementList(page.html);

    for (const record of records) {
      const normalized = normalizeBppaListRecord(record);

      // Fetch detail only if:
      // - new,
      // - hash changed,
      // - high-value field missing.
      if (shouldFetchDetail(normalized)) {
        await sleep(randomBetween(2000, 5000));
        const detail = await fetchPublicDetail(record.sourceUrl);
        mergeBppaDetail(normalized, detail);
      }

      await upsertOpportunity(normalized);
    }
  }
}
```

---

# 70. Source Parser Resilience

Each source adapter must have fixture tests.

Store a sanitized HTML/JSON fixture.

Example tests:

```text
parses title
parses external ID
parses deadline
parses issuer
rejects empty page
detects markup change
```

If parser suddenly returns zero records but historical baseline is non-zero:

```text
fail sync as suspicious
do not mark all opportunities closed
alert developer
```

---

# 71. Opportunity Status Logic

```ts
function deriveStatus(deadlineAt?: Date, sourceStatus?: string) {
  if (sourceStatus?.includes("cancel")) return "cancelled";
  if (sourceStatus?.includes("award")) return "awarded";
  if (!deadlineAt) return "unknown";
  if (deadlineAt < new Date()) return "closed";
  return "open";
}
```

Do not assume a missing notice means cancelled.

---

# 72. Timezone Rules

Store all timestamps in UTC.

Display in:

- user's timezone,
- optionally source timezone when important.

Default user timezone for Bangladesh pilot:

```text
Asia/Dhaka
```

Deadline UI should show:

```text
17 Oct 2026, 3:00 PM (Bangladesh time)
```

when time is available.

If source supplies date only:

```text
17 Oct 2026
```

Do not invent a time.

---

# 73. Date Reliability

Every opportunity must expose:

```text
publication date
deadline date
source verification link
last synced time
```

If deadline parsing confidence is low, show:

```text
Deadline needs verification
```

Do not infer a date from ambiguous free text without flagging uncertainty.

---

# 74. Security

Minimum MVP requirements:

- HTTPS only,
- Supabase Auth,
- RLS,
- server-side entitlement checks,
- signed storage URLs,
- no service-role key in browser,
- CSRF-safe framework actions,
- strict validation with Zod,
- rate-limit assessment generation,
- sanitize rendered source HTML,
- never render arbitrary source HTML directly,
- no secrets in repository,
- environment-variable secrets,
- audit important admin/team actions.

---

# 75. Data Privacy

Evidence documents may contain:

- company registrations,
- financial data,
- certificates,
- confidential project details.

Therefore:

- private buckets only,
- no public URLs,
- least-privilege access,
- do not use uploaded documents to train unrelated models,
- disclose which AI provider processes content,
- allow deletion,
- prefer sending only required excerpts to AI providers.

For BRAC IT pilot, confirm permission before uploading sensitive internal financial/company documents.

---

# 76. Rate Limiting

Recommended application limits:

```text
search: generous
assessment create: 5/min/user
document upload initialization: 10/min/user
invite: 10/hour/workspace
comments/tasks: normal anti-abuse limits
```

Source crawling rate limit is independent and more conservative.

---

# 77. Observability

Keep it simple.

Use:

- Vercel logs,
- Supabase logs,
- GitHub Actions logs.

Add application tables for:

```text
source sync runs
AI failures
notification failures
```

Optionally add Sentry only if errors become difficult to diagnose.

---

# 78. Health Dashboard

Internal page:

```text
/admin/sources
```

Show:

```text
source
enabled
last successful sync
last attempt
records fetched
new records
changed records
status
error
```

Admin-only.

---

# 79. Analytics Events

Avoid expensive analytics infrastructure.

Recommended events:

```text
signup_completed
workspace_created
onboarding_completed
opportunity_viewed
opportunity_shortlisted
assessment_started
assessment_completed
assessment_failed
decision_recorded
source_link_opened
profile_updated
document_uploaded
invite_sent
task_created
```

Can initially be stored in:

```sql
product_events
```

or use a lightweight analytics service later.

---

# 80. Pilot Metrics

Dashboard should eventually answer:

```text
How many opportunities were discovered?
How many were strong matches?
How many were assessed?
How many were shortlisted?
How many received decisions?
How many were pursued?
How early were they discovered?
How long did assessment take?
How often did users disagree with TenderSense?
```

---

# 81. Testing Strategy

## Unit tests

Test:

- matching score,
- feature gates,
- deadline calculations,
- entitlement usage,
- source normalizers,
- amendment diff,
- status logic.

## Integration tests

Test:

- workspace isolation,
- assessment quota,
- shortlist flow,
- invitation flow,
- upload access,
- RLS.

## Source fixture tests

Mandatory.

## E2E tests

Critical user journeys only:

```text
signup → profile → discover → shortlist
assessment → result
invite → join
decision → history
```

Use Playwright for application E2E, not as the default source scraper.

---

# 82. Seed Data

Create development fixtures:

```text
1 personal Free workspace
1 BRAC IT-like Pro workspace
3 users
20 opportunities
2 sources
5 projects
4 credentials
10 matches
3 assessments
6 shortlist items
```

Never use real confidential BRAC IT information in public repositories.

---

# 83. Error States

Required UX states:

```text
source temporarily unavailable
assessment failed
assessment quota reached
no opportunities found
profile incomplete
deadline unavailable
source URL unavailable
document extraction failed
invite expired
permission denied
```

Always provide a safe next action.

---

# 84. Empty States

Examples:

## No feed matches

```text
No strong matches yet.
Try adding more services or countries to your monitoring preferences.
```

## No projects

```text
Add past projects to improve experience matching.
```

## No shortlist

```text
Shortlist opportunities you want to evaluate with your team.
```

---

# 85. Accessibility

MVP baseline:

- semantic HTML,
- keyboard navigation,
- visible focus states,
- labels for form controls,
- color not sole status indicator,
- sufficient contrast,
- screen-reader names,
- tables responsive and navigable.

---

# 86. Performance

Targets:

```text
initial application page < 3s on reasonable broadband
search response < 1s typical
match read < 300ms typical
assessment async, never block UI request
```

Use pagination.

Do not fetch thousands of opportunities into the browser.

---

# 87. Pagination

Use cursor pagination where possible.

MVP can use page/limit for simpler endpoints.

Default:

```text
20 records
```

Maximum:

```text
100 records
```

---

# 88. Assessment Asynchronous Execution

Assessment generation may exceed request timeout.

Recommended MVP approaches, in order:

1. background Supabase Edge Function / job,
2. server job table polled by worker,
3. temporary long-running supported server function if provider permits.

Use a `jobs` table if a dedicated queue is not available.

```sql
jobs
- id uuid pk
- type text
- payload jsonb
- status text
- attempts int
- available_at timestamptz
- locked_at timestamptz null
- locked_by text null
- last_error text null
- created_at timestamptz
- completed_at timestamptz null
```

A scheduled worker claims queued jobs safely.

---

# 89. Idempotency

All important actions should support safe retry.

Source upsert:

```text
unique(source_key, external_id)
```

Assessment create:

Accept optional:

```text
Idempotency-Key
```

Email notifications:

```text
unique(notification_type + target + event_id)
```

---

# 90. Email Delivery

Store outbound email log:

```sql
email_deliveries
- id uuid pk
- user_id uuid
- template_key text
- event_key text
- provider_message_id text null
- status text
- sent_at timestamptz null
- error text null
```

Never send the same daily digest twice for the same user/date.

---

# 91. Free vs Pro UX

Do not hide all Pro features completely.

Show useful contextual upgrade moments.

Example:

```text
This assessment found 4 possible evidence matches.
Upload company documents to verify them automatically with Pro.
```

Avoid interruptive upgrade modals on every action.

---

# 92. Billing

Do not integrate payments until the BRAC IT pilot validates value unless external paid users are required immediately.

MVP plan can be controlled manually:

```sql
workspaces.plan = 'pro'
```

When commercializing, add Stripe or suitable billing provider behind a billing abstraction.

Do not entangle Stripe IDs with core domain logic.

---

# 93. Soft Delete

For workspace-owned business records:

```text
deleted_at
```

may be useful.

For immutable history:

- decisions: never soft-overwrite,
- revisions: append-only,
- audit events: append-only.

---

# 94. Audit Events

Table:

```sql
audit_events
- id uuid pk
- workspace_id uuid
- actor_user_id uuid
- entity_type text
- entity_id uuid
- action text
- metadata jsonb
- created_at timestamptz
```

Track:

```text
member invited
member removed
decision made
owner changed
profile credential changed
document deleted
```

---

# 95. Recommended Cron Schedule

World Bank:

```text
2x daily initially
```

BPPA/e-GP:

```text
2–4x daily
```

Daily digest:

```text
once each morning per user timezone
```

Match recomputation:

```text
after new opportunity batch
after profile changes
```

Do not recompute all matches for all workspaces on every page request.

---

# 96. GitHub Actions Example

```yaml
name: Sync World Bank

on:
  schedule:
    - cron: "15 1,13 * * *"
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - run: npm ci

      - run: npm run sync:world-bank
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

Do not put Supabase service-role keys directly in script output/logs.

---

# 97. Environment Variables

Example:

```env
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=

RESEND_API_KEY=
EMAIL_FROM=

AI_PROVIDER=none
OPENAI_API_KEY=
INTERNAL_CRON_SECRET=

WORLD_BANK_DATASET_ID=DS00979
WORLD_BANK_RESOURCE_ID=RS00909

SOURCE_USER_AGENT=
SOURCE_CONTACT_EMAIL=
```

Commit:

```text
.env.example
```

Never commit `.env.local`.

---

# 98. Database Migration Rules

All schema changes must use migrations.

Never manually modify production schema without committing equivalent migration.

Naming example:

```text
202609110001_create_workspaces.sql
202609110002_create_opportunities.sql
202609110003_create_assessments.sql
```

---

# 99. Data Backups

Supabase Free does not provide the same backup guarantees as paid production tiers.

For pilot:

Run a scheduled lightweight database dump if feasible.

At minimum export:

```text
workspaces
profiles
projects
credentials
shortlist
decisions
assessments
```

Do not rely on a single hosted copy for critical pilot data.

---

# 100. Scalability Model

The architecture should scale in stages.

## Stage 1 — Pilot

```text
1–10 workspaces
<100 users
<100k opportunities
Supabase + Next.js + GitHub Actions
```

## Stage 2 — Early SaaS

```text
100–1,000 workspaces
source ingestion workers separated
job queue
Postgres indexes tuned
paid database tier
AI batching
```

## Stage 3 — Scale

Potentially introduce:

```text
dedicated ingestion service
message queue
read replicas
search service if necessary
object storage optimization
data warehouse for analytics
```

Do not build Stage 3 during MVP.

---

# 101. Scalability Boundaries

The normalized opportunity store is shared globally.

Do **not** copy the same opportunity into every workspace.

Use:

```text
opportunities
+
opportunity_matches(workspace_id, opportunity_id)
+
shortlist_items(workspace_id, opportunity_id)
```

This is critical for scalability.

---

# 102. Match Computation Strategy at Scale

Pilot:

```text
for each new opportunity
  compute against active workspaces
```

Early SaaS:

Pre-filter workspaces using:

```text
country
source
sector
service taxonomy
```

Then run detailed matching only for candidates.

Do not create Cartesian product matching across millions of opportunities and workspaces.

---

# 103. Opportunity Archival

Keep historical opportunities.

Do not delete closed tenders.

They are useful for:

- source quality,
- organizational learning,
- future matching,
- reporting,
- likely tender recurrence.

Default Discover hides closed opportunities unless user selects history.

---

# 104. Data Retention

Suggested:

```text
normalized opportunities: indefinite
source raw payload: 90–180 days or minimal current snapshot
sync logs: 90 days
AI cache: retain while input hash relevant
user activity/audit: retain according to product policy
deleted workspace documents: hard-delete after grace period
```

---

# 105. Internationalization

MVP UI may be English-first.

Data model must support:

```text
raw source language
normalized English summary optional
```

For Bangla notices:

- preserve original text,
- optionally produce English summary,
- future Bangla UI possible.

Never overwrite original language.

---

# 106. Source Data Quality

Add fields:

```text
data_quality_score
deadline_confidence
issuer_confidence
```

Optional for MVP, but parser-level warnings should exist.

Possible warning:

```text
Source notice does not provide a structured deadline. Verify official source.
```

---

# 107. Duplicate Detection Across Sources

Same tender may appear in more than one source.

MVP should not aggressively merge cross-source records.

Reason:

False merges are dangerous.

Phase 1:

```text
deduplicate within same source only
```

Phase 2:

Create suggested cross-source links using:

```text
title similarity
issuer
country
deadline
reference number
project ID
```

Keep both source records authoritative.

---

# 108. Original Documents

Opportunity documents table:

```sql
opportunity_documents
- id uuid pk
- opportunity_id uuid
- title text
- source_url text
- mime_type text null
- document_type text null
- source_document_id text null
- discovered_at timestamptz
- last_seen_at timestamptz
```

Do not download all source documents.

---

# 109. Activity Model

Workspace activity examples:

```text
Opportunity shortlisted
Assessment completed
Owner assigned
Comment added
Decision recorded
Task completed
Deadline changed
```

Activity table:

```sql
activity_events
- id uuid pk
- workspace_id uuid
- actor_user_id uuid null
- opportunity_id uuid null
- event_type text
- payload jsonb
- created_at timestamptz
```

---

# 110. Decision Reason Codes

Provide useful structured reasons.

Pursue:

```text
strong_fit
strategic_priority
existing_client
good_timeline
partner_available
```

Hold:

```text
needs_management_review
missing_information
partner_needed
eligibility_uncertain
resource_constraint
```

Decline:

```text
eligibility_gap
insufficient_time
low_strategic_fit
commercially_unattractive
capacity_constraint
geography
other
```

Always allow free-text note.

---

# 111. Reports

MVP report cards:

```text
Opportunities discovered
Strong matches
Assessments run
Shortlisted
Pursue
Hold
Decline
Average days remaining at discovery
Average days remaining at decision
```

Pipeline:

```text
Discovered → Assessed → Shortlisted → Pursue
```

---

# 112. CSV Export

Pro export columns:

```text
TenderSense ID
Source
Source ID
Title
Issuer
Country
Publication date
Deadline
Days remaining
Match score
Assessment score
Shortlist state
Owner
Decision date
Decision reason
Official source URL
```

Avoid exporting sensitive internal evidence by default.

---

# 113. MVP Build Phases

## Phase 0 — Foundation

Build:

- repository,
- Next.js,
- Supabase,
- auth,
- migrations,
- workspace model,
- RLS,
- deployment.

Exit criteria:

```text
user can sign in and create a workspace securely
```

## Phase 1 — Source ingestion

Build:

- source adapter abstraction,
- World Bank adapter,
- BPPA adapter,
- cron jobs,
- source health,
- normalized opportunities.

Exit criteria:

```text
fresh opportunities appear automatically
```

## Phase 2 — Discovery

Build:

- Discover list,
- search,
- filters,
- opportunity detail,
- original links,
- monitoring profile.

Exit criteria:

```text
user can reliably find opportunities
```

## Phase 3 — Matching

Build:

- profile capabilities,
- deterministic matching,
- reasons,
- personalized feed.

Exit criteria:

```text
user understands why opportunities are shown
```

## Phase 4 — Assessment

Build:

- quota,
- requirement extraction,
- eligibility statuses,
- scores,
- assessment history.

Exit criteria:

```text
assessment provides actionable qualification information
```

## Phase 5 — Collaboration

Build:

- team,
- shared shortlist,
- owner,
- comments,
- decisions,
- tasks.

Exit criteria:

```text
BRAC IT can run a real opportunity review workflow
```

## Phase 6 — Alerts/reporting

Build:

- revisions,
- deadline alerts,
- digest,
- reports,
- export.

Exit criteria:

```text
pilot can measure real value
```

---

# 114. Definition of MVP Done

The MVP is ready for BRAC IT pilot when:

1. World Bank opportunities sync automatically.
2. Bangladesh public opportunities sync with a stable public-source adapter.
3. users can sign up and create personal/organization workspace,
4. users can define monitoring preferences,
5. Discover shows current opportunities,
6. opportunity detail always links to official source,
7. match score/reasons work without AI,
8. detailed assessment works with quota,
9. eligibility requirements show evidence/gaps/unknowns,
10. BRAC IT can invite up to five users,
11. shared shortlist works,
12. opportunity owner works,
13. Pursue/Hold/Decline history works,
14. lightweight tasks work,
15. deadline changes generate alerts,
16. daily Pro digest works,
17. reports show pilot metrics,
18. RLS tests prove workspace isolation,
19. source parsers have fixture tests,
20. basic backup/export exists.

---

# 115. AI Coding Agent Rules

Any AI coding agent working on this repository must follow these rules.

## Rule 1

Do not invent new product scope without updating this SOT.

## Rule 2

Do not bypass RLS or use service-role credentials in client code.

## Rule 3

Do not add a paid infrastructure dependency when a simple existing stack feature is adequate.

## Rule 4

Do not add microservices during MVP without a proven need.

## Rule 5

Do not perform AI calls during page rendering when the result can be cached/precomputed.

## Rule 6

Do not treat LLM output as authoritative source data.

## Rule 7

Do not automate authenticated procurement portal actions.

## Rule 8

All source parsers require fixtures/tests.

## Rule 9

All schema changes require migrations.

## Rule 10

All Pro feature gates must be enforced server-side.

## Rule 11

All workspace-owned rows require workspace isolation.

## Rule 12

Do not remove official source attribution.

## Rule 13

Do not overwrite decision or amendment history.

## Rule 14

Unknown eligibility information must be `needs_verification`, not automatically `gap`.

## Rule 15

Prefer incremental implementation over premature abstraction.

---

# 116. Implementation Priorities for a Solo Founder

When forced to choose:

```text
reliability > cleverness
explainability > AI magic
source accuracy > beautiful summaries
simple SQL > extra infrastructure
cached results > repeated AI calls
one stable source > five fragile scrapers
pilot learning > enterprise completeness
```

---

# 117. First Technical Milestone

The first milestone should be:

> A signed-in user creates an organization profile, selects Bangladesh + World Bank as monitoring sources, and sees a current normalized opportunity feed containing both World Bank and Bangladesh public procurement notices with official source links.

Do not build AI assessment before this works reliably.

---

# 118. Second Technical Milestone

> The user adds services/capabilities and receives deterministic personalized match scores with explainable reasons.

---

# 119. Third Technical Milestone

> The user runs a detailed assessment and receives requirements categorized as Meets / Partially Meets / Needs Verification / Gap, with evidence links where available.

---

# 120. Fourth Technical Milestone

> A BRAC IT team can shortlist, assign, discuss, decide Pursue/Hold/Decline, and see deadline/amendment changes.

---

# 121. Known Risks

## Source fragility

Public HTML may change.

Mitigation:

```text
adapter isolation
fixtures
health checks
low crawl frequency
official-source preference
```

## False AI extraction

Mitigation:

```text
structured output
source locations
confidence
human verification
```

## Sparse company profile

Mitigation:

```text
progressive profiling
needs_verification status
profile completeness prompts
```

## AI cost

Mitigation:

```text
deterministic matching
cache
optional provider
small input context
assessment quota
```

## Free-tier platform limits

Mitigation:

```text
monitor usage
easy migration path
avoid vendor-specific architecture
```

## Legal/data reuse uncertainty

Mitigation:

```text
use public information only
retain official links
minimum necessary caching
respect source terms
seek official feeds/permission as product scales
```

---

# 122. Future Backlog — Not MVP

Possible future capabilities:

- ADB source,
- UNGM source,
- EU TED source,
- SAM.gov source,
- donor portals,
- organization sub-workspaces,
- consortium/partner matching,
- recurring tender prediction,
- competitor/winner intelligence from awards,
- bid probability models,
- proposal drafting assistance,
- RFP document Q&A,
- structured compliance matrix export,
- calendar integration,
- Slack/Teams alerts,
- SSO,
- API access,
- webhooks,
- multi-language interface,
- mobile app,
- enterprise approval workflows.

---

# 123. Suggested Next Source Adapters

After World Bank + Bangladesh:

Priority should be based on pilot demand, not source popularity.

Suggested evaluation criteria:

```text
BRAC IT relevance
public/legal access
API availability
data structure quality
update frequency
source stability
implementation effort
```

Prefer official APIs over scraping.

---

# 124. References / External Source Notes

## Bangladesh e-GP

National e-Government Procurement portal:

```text
https://www.eprocure.gov.bd/
```

Public eTender search:

```text
https://www.eprocure.gov.bd/resources/common/StdTenderSearch.jsp?h=t
```

Terms:

```text
https://www.eprocure.gov.bd/TermsNConditions.jsp
```

BPPA public notices:

```text
https://www.bppa.gov.bd/advertisement-notices.html
```

BPPA notice search:

```text
https://www.bppa.gov.bd/advertisement-notices/notice-search.html
```

Notes:

- e-GP is operated by Bangladesh Public Procurement Authority.
- public tender information is available without using authenticated tenderer actions.
- portal content/material is described as BPPA/Government-owned.
- TenderSense must avoid authenticated automation and preserve official links.

## World Bank

Procurement notices UI:

```text
https://projects.worldbank.org/en/projects-operations/procurement
```

Dataset:

```text
https://financesone.worldbank.org/procurement-notice/DS00979
```

API explorer:

```text
https://financesone.worldbank.org/api-explorer?id=DS00979
```

API:

```text
https://datacatalogapi.worldbank.org/dexapps/fone/api/apiservice?datasetId=DS00979&resourceId=RS00909&type=json
```

World Bank states that the dataset is public, updated daily, and available under Creative Commons Attribution 4.0.

---

# 125. Infrastructure Reference Notes

These limits change over time; verify before production launch.

At SOT preparation time:

## Supabase Free

Suitable for pilot-scale use with:

- PostgreSQL,
- Auth,
- limited database/storage,
- API access.

Official pricing:

```text
https://supabase.com/pricing
```

## GitHub Actions

Free plan includes a monthly hosted-runner allowance for private repositories.

Official billing:

```text
https://docs.github.com/en/billing/concepts/product-billing/github-actions
```

## Resend

Free transactional email tier can support an early pilot.

Official pricing:

```text
https://resend.com/pricing
```

## Vercel

Vercel is the required hosting/deployment platform for the TenderSense MVP. Use the lowest suitable plan during pilot development and verify current plan/commercial-use limits before public commercialization.

Official pricing:

```text
https://vercel.com/pricing
```

---

# 126. Final Product Principle

TenderSense should never become:

> “A prettier list of tenders.”

The MVP must demonstrate this difference:

```text
Public tender source
      ↓
Normalized opportunity
      ↓
Relevant to THIS organization?
      ↓
Why?
      ↓
Do they qualify?
      ↓
What is missing?
      ↓
How much time remains?
      ↓
What should the team decide?
```

That is the product.

---

# 127. AI Builder Starting Instruction

Use the following instruction when giving this SOT to an AI coding agent:

```text
You are implementing TenderSense from the attached Source of Truth.

Treat the SOT as authoritative product and technical scope.

Before writing code:
1. identify the current build phase,
2. list the exact SOT sections relevant to the task,
3. inspect existing schema/code before proposing changes,
4. preserve the documented architecture unless there is a concrete technical blocker,
5. do not add non-MVP scope,
6. enforce workspace isolation and plan entitlements server-side,
7. keep source ingestion adapters isolated,
8. use official APIs where available,
9. do not automate authenticated procurement workflows,
10. include tests for every parser, entitlement, and critical business rule.

When a requirement is ambiguous:
- choose the simplest implementation consistent with this SOT,
- document the assumption,
- do not invent enterprise features.

Definition of success:
a stable, inexpensive MVP that validates tender discovery, qualification, earlier decision-making, and lightweight team collaboration for the BRAC IT pilot.
```

---

# 128. Change Control

This file is the product/technical source of truth.

Any material change should update:

```text
Version
Date
Changed section
Reason
Decision owner
```

Suggested changelog:

| Version | Date | Change | Reason |
|---|---|---|---|
| 0.2 | 2026-09-11 | Locked MVP stack to Next.js + TypeScript + Supabase + Vercel + GitHub; removed Cloudflare from MVP architecture | Simplify solo-founder infrastructure |
| 0.1 | 2026-09-11 | Initial MVP SOT | Establish build baseline |

---

# END OF SOT
