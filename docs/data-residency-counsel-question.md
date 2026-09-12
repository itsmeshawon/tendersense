# Data-Residency Counsel Question — Draft

**Status:** Draft — refine with the user, then send to counsel.
**Context:** ADR 0006 §9 flagged data residency as "not a launch-blocker for the current MVP scope, but must not drift." This is the actual question to file, sharpened per the concern in SoT-Changes 2026-09-09 that a general "procurement data" ask will get a general answer.

---

## Cover paragraph (for the counsel intake)

We operate a SaaS product called TenderSense, hosted on Vercel with data storage in Supabase (a managed PostgreSQL service). Our Supabase project is provisioned in AWS Mumbai (`ap-south-1`) — i.e. India, not Bangladesh. We are launching a pilot with a Bangladesh-based enterprise customer (BRAC IT Services). We need a written opinion on whether our data-storage architecture complies with Bangladesh law, both for our pilot scope and for a broader launch scope. **We do not need a general opinion on procurement data — we need answers on two specific categories described below.**

Please respond with:

1. **Pilot launch clearance** — can we launch the pilot as scoped, without changes?
2. **Broader launch conditions** — what would need to change (or what disclosures would be required) to add the broader-scope features to Pro tier?
3. **Regime references** — cite the specific Bangladeshi statute, regulation, or guideline you are relying on for each answer, plus its effective date. We are aware that the Bangladeshi data-protection regime moved materially in 2025 and again in 2026 and want to make sure your opinion reflects the current state.

## Category 1 — Data in scope for the current MVP pilot

Storing all of the following on Supabase in Mumbai:

- **Public procurement notices** — HTML pages and JSON API responses scraped or fetched from public sources: World Bank Procurement Notice dataset (public API), Bangladesh e-GP tender-notice pages (`www.eprocure.gov.bd`), and BPPA advertisement pages (`www.bppa.gov.bd`). These are already publicly published by the source authorities.
- **User authentication data** — email addresses and hashed session credentials for the pilot users (approximately five people from a single BRAC IT bid team plus our own founder accounts).
- **Workspace metadata** — company name, workspace type, plan tier. No confidential company financials, no uploaded documents in this scope.
- **User-selected past contracts** — records fetched from Bangladesh e-GP's public "eExperience" register for a given company name. The user ticks which of those contracts belong to their workspace. We store what they tick, referencing the e-GP-issued certificate number. Original data is already public on the e-GP register.
- **Named-official contact information incidentally present in notice pages** — Bangladesh e-GP tender notices include the name and direct phone/email of procuring-entity officials responsible for the tender. Our current architecture:
  - Stores the raw notice HTML in `source_records.payload`, which contains these fields.
  - Does not index the official's name/phone/email as structured columns.
  - Does not display the official's contact info in list views of tenders.
  - Displays it only on the tender-detail page to authenticated workspace members of the pilot customer.

**Specific questions on Category 1:**

- **Q1.1** Does the storage of public procurement notices (including the embedded named-official contact fields described above) in AWS Mumbai constitute processing of personal data in a way that requires notification, consent, or in-country storage under current Bangladesh law?
- **Q1.2** Does the "public interest" or "publicly available information" exception (if any) in the current regime cover our reuse of named-official contact data that was originally published by the government on a public portal?
- **Q1.3** Does our storage of user authentication data (emails, sessions) in Mumbai require any disclosure to pilot users, and if so, what is the minimum required disclosure text?
- **Q1.4** Are there additional obligations we take on if the pilot customer is BRAC (a large Bangladesh-based enterprise) vs. a smaller Bangladesh-based customer?
- **Q1.5** Under Category 1 scope only, is there any obligation that would require moving the data to a Bangladesh-based host before we can launch the pilot?

## Category 2 — Data that will enter scope when the Pro tier ships (post-pilot)

At the Pro tier we intend to accept the following from the customer:

- **Customer-uploaded corporate documents** — audited financial statements, trade licenses, tax clearance certificates, ISO or other quality-management certificates, prior-work certificates, bank solvency letters. These are documents the customer produces themselves and uploads to support tender-eligibility assessment.
- **Structured company financials** — turnover figures, employee counts, credit-line capacity — either entered manually or extracted from uploaded documents.
- **Team-collaboration metadata** — internal comments, decision history, task assignments among the customer's own team members inside their workspace.

All of the above would be stored on the same Supabase Mumbai instance. Access is restricted by row-level security to that workspace's members.

**Specific questions on Category 2:**

- **Q2.1** Do customer-uploaded corporate documents (audited financials, tax certificates, licenses) constitute a category of data that Bangladesh law requires to be stored in Bangladesh, restricts from cross-border transfer, or subjects to specific consent/notification requirements?
- **Q2.2** If cross-border storage is permitted for Q2.1 data, what disclosures, contractual clauses, or user-agreement provisions must we include? Is a standard data-processing addendum acceptable, or is there a specific Bangladesh form?
- **Q2.3** Are there any sector-specific rules (public-procurement sector, corporate confidentiality, banking secrecy for financial statements) that override the general regime for the specific document types in Q2.1?
- **Q2.4** Does storage of team-collaboration metadata (comments, decisions) trigger any distinct obligations beyond the underlying documents themselves?

## Category 3 — Data we deliberately do not collect

For completeness — we want counsel to confirm the following exclusions are load-bearing:

- We do **not** integrate with, log into, or scrape any authenticated-only portion of e-GP or any government portal. All ingestion is from public URLs only.
- We do **not** store or handle bid submissions, tender-document purchases, bank guarantees, or any transactional element of the procurement flow.
- We do **not** collect personal data about anyone other than (a) our registered users and (b) the named officials already published on public tender notices.

**Q3.1** Given these exclusions, is our threat surface materially smaller than a typical Bangladesh SaaS in the procurement space, and does that shift the answers to Categories 1 and 2 in any way?

## Regime references we're aware of but want counsel to verify

- Bangladesh's Personal Data Protection Ordinance / Act (moved through drafts in 2022, 2023, 2024, with material updates in 2025 and further updates in 2026). We want the current in-force version cited by name and effective date.
- Bangladesh Bank data-localization rules (financial data). We understand these do not apply to us today because we do not process financial-institution data, but please confirm.
- ICT Act / Digital Security Act successors and any BTRC circulars on cross-border data flows.
- Any sector-specific rules issued by BPPA or the Cabinet Division that touch procurement discovery / advisory services.

## Turnaround

We are targeting a pilot launch decision within four weeks. If any answer is "you cannot launch until X changes," we need to know that inside two weeks so we can either change architecture or defer launch. Please flag any answer whose resolution would take longer than two weeks so we can plan accordingly.

## Attachments to send with this question

- ADR 0006 (SoT scope adjustments) — sections §8 (PII stance) and §9 (data-residency stance) — attached
- Repository README describing hosting architecture — attached
- Sample tender-notice HTML from e-GP showing the named-official fields in place — attached (redacted screenshot with fake names)

## What we do NOT need from this engagement

- General overview of Bangladesh data-protection law
- Recommendations on tooling, cloud vendor, or architecture
- A commercial contract or DPA — that's a separate engagement

We need direct answers to the numbered questions above, with citations.

---

## Notes for me (not for counsel)

- The two hardest questions are Q1.2 (public-interest exception for named-official reuse) and Q2.1 (whether customer uploads trigger localization). Everything else likely has a clean answer.
- If counsel says Q2.1 requires localization, that's a signal to either delay Pro or add a Bangladesh-based host option gated to Bangladesh customers. Not a launch-blocker for pilot; a strategy decision for Pro.
- Q1 alone is what the pilot depends on. Q2 shapes the Pro roadmap. Read the answers with that split in mind.
- Do not send this to counsel until: (a) user has reviewed and refined the wording; (b) the exact pilot customer name (BRAC IT Services) has been confirmed as OK to name in a legal query, or is redacted if not.
