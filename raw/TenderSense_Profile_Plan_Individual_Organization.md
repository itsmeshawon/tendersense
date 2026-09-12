# TenderSense — Profile Plan for Individuals and Organizations

> **Document purpose:** Define the profile information TenderSense should collect from individuals and organizations to improve tender discovery, matching, qualification, and evidence-backed assessment.
>
> **Audience:** Product owner, UX/UI designer, AI coding agents, frontend/backend developers, QA, and future collaborators.
>
> **Status:** MVP profile specification  
> **Version:** 0.1  
> **Date:** 2026-09-12  
> **Related SOT:** `TenderSense_MVP_Source_of_Truth.md`

---

# 1. Why the Profile Exists

The TenderSense profile is not a generic account profile. It is a **matching and qualification profile**.

It exists to help TenderSense answer four questions:

1. What can this person or organization do?
2. What kinds of opportunities do they actually want?
3. What evidence proves their capabilities and eligibility?
4. How confidently can TenderSense recommend or qualify an opportunity?

TenderSense must keep three concepts separate:

```text
CAPABILITY
What the person or organization can do

PREFERENCE
What opportunities they want

EVIDENCE
What proves capability or eligibility
```

Example:

```text
Capability:
BRAC IT can deliver enterprise web applications.

Preference:
BRAC IT may not want small website-development tenders.

Evidence:
BRAC IT may have multiple completed enterprise projects proving delivery capability.
```

If these concepts are mixed together, matching quality will decline.

---

# 2. How Profile Data Supports Matching

TenderSense should use profile data in two stages.

## Stage A — Opportunity Fit

This answers:

> Is this the kind of opportunity this user or organization should care about?

Inputs:

```text
services
skills
technologies
sector
country
source
opportunity type
project similarity
preferred value
timeline
```

Example:

```text
Opportunity Fit
91% — Strong Fit
```

## Stage B — Qualification

This answers:

> Based on available evidence, how likely is the user or organization to meet the formal requirements?

Inputs:

```text
years of experience
similar-project count
project value
certifications
financial capacity
legal status
geographic experience
key personnel
supporting documents
```

Example:

```text
Qualification
78% — Potentially Eligible

2 requirements need verification
1 confirmed gap
```

Do not collapse these into one unexplained score.

---

# 3. Profile Data Priority Model

## P0 — Required for useful matching
Collect during onboarding.

## P1 — Strongly improves matching
Collect progressively after onboarding.

## P2 — Qualification intelligence
Mostly relevant to Pro users and formal tender assessment.

## P3 — Advanced / future
Useful later but not required for MVP validation.

---

# 4. Individual Profile — Purpose

The Individual Profile is intended for:

- independent consultants,
- freelancers,
- subject-matter experts,
- solo founders,
- professionals applying for consulting assignments.

The core matching model is:

```text
Expertise
+ Skills
+ Sector Experience
+ Years of Experience
+ Past Assignments
+ Education
+ Certifications
+ Geographic Experience
+ Preferences
```

---

# 5. Individual Profile Structure

```text
Individual Profile

├── Identity
├── Professional Summary
├── Services / Expertise
├── Skills / Technologies
├── Sector Experience
├── Years of Experience
├── Project / Assignment Experience
├── Geographic Experience
├── Education
├── Certifications
├── Languages
├── Availability
├── Evidence
└── Tender Preferences
```

---

# 6. Individual Profile Fields

## 6.1 Identity

| Field | Priority | Required | Rationale |
|---|---|---:|---|
| Full name | P0 | Yes | Required for identity and profile presentation. |
| Country of residence | P0 | Yes | Helps filter local, regional, and practical availability constraints. |
| Nationality | P1 | No | Some consultancy assignments include citizenship/nationality restrictions. |
| City | P2 | No | Useful for local or on-site assignments. |
| Time zone | P2 | No | Useful for remote collaboration; not a major matching signal. |

**Rule:** Nationality must not increase relevance unless the opportunity explicitly makes it relevant.

---

## 6.2 Professional Summary

| Field | Priority | Required | Rationale |
|---|---|---:|---|
| Professional headline | P0 | Yes | Gives a high-level semantic identity such as “ERP Business Analyst.” |
| Professional summary | P1 | No | Helps when structured taxonomy does not capture nuanced expertise. |
| Total years of experience | P0 | Yes | Common minimum qualification criterion for consultants. |

Example:

```text
Headline:
Digital Transformation & ERP Consultant

Experience:
12 years
```

---

## 6.3 Services / Expertise

Examples:

```text
Business Analysis
Project Management
UX/UI Design
Software Architecture
ERP Consulting
Cybersecurity
Data Engineering
Monitoring & Evaluation
Financial Management Consulting
Procurement Consulting
```

Recommended fields:

```text
Expertise
Years
Primary / Secondary
```

| Field | Priority | Required | Rationale |
|---|---|---:|---|
| Primary expertise | P0 | Yes | Strongest discovery signal. |
| Secondary expertise | P1 | No | Helps discover adjacent opportunities. |
| Years per expertise | P1 | No | Supports minimum-experience requirements. |
| Primary/secondary status | P1 | No | Prevents weak secondary skills from matching too strongly. |

---

## 6.4 Skills / Technologies

Examples:

```text
Java
Angular
React
Python
Figma
AWS
Azure
SAP
Oracle
Power BI
TOGAF
Scrum
```

| Field | Priority | Required | Rationale |
|---|---|---:|---|
| Skill/technology | P0 | Yes | Used for technical requirement matching. |
| Years using skill | P1 | No | Useful when tenders request minimum years. |
| Last used date | P2 | No | Helps reduce weight of outdated experience. |

---

## 6.5 Sector Experience

Examples:

```text
Government
Banking
Microfinance
Education
Healthcare
Agriculture
NGO
RMG
Telecommunications
Energy
Transport
```

| Field | Priority | Required | Rationale |
|---|---|---:|---|
| Sector | P0 | Yes | Strong relevance and qualification signal. |
| Years in sector | P1 | No | Supports sector-experience thresholds. |
| Number of assignments | P2 | No | Provides stronger evidence than a tag alone. |

---

## 6.6 Project / Assignment Experience

Fields:

```text
Assignment name
Client
Client type
Country
Sector
Role
Start date
End date
Services delivered
Technologies / methods
Scope
Key outcomes
Assignment value optional
Reference/contact optional
Evidence
```

| Field | Priority | Required | Rationale |
|---|---|---:|---|
| Assignment/project name | P1 | No | Identifies historical evidence. |
| Client | P1 | No | Helps validate institutional experience. |
| Country | P1 | No | Supports geographic criteria. |
| Sector | P1 | No | Supports sector-specific qualification. |
| Role | P1 | No | Critical because individual eligibility depends on what the person personally did. |
| Start/end dates | P1 | No | Enables recency and experience-duration calculations. |
| Services/tasks | P1 | No | Core similarity signal. |
| Technologies/methods | P2 | No | Useful for technical similarity. |
| Outcomes | P2 | No | Supports qualitative relevance. |
| Evidence | P2 | No | Improves qualification confidence. |

**Rule:** Participation in a project must not be treated as organization-level ownership.

---

## 6.7 Geographic Experience

Fields:

```text
Country
Number of assignments
Years active
Sector experience
```

| Field | Priority | Required | Rationale |
|---|---|---:|---|
| Countries worked in | P1 | No | Useful for regional/international experience criteria. |
| Assignment count by country | P2 | No | Improves confidence. |

---

## 6.8 Education

Fields:

```text
Degree
Subject
Institution
Country
Graduation year
```

| Field | Priority | Required | Rationale |
|---|---|---:|---|
| Highest degree | P1 | No | Individual consultant tenders often specify academic qualifications. |
| Subject | P1 | No | Important when a specific discipline is mandatory. |
| Institution | P2 | No | Supporting evidence/context. |
| Graduation year | P2 | No | May help calculate post-qualification experience. |

---

## 6.9 Certifications

Fields:

```text
Certification name
Issuer
Credential number
Issue date
Expiry date
Status
Evidence
```

Examples:

```text
PMP
CISSP
TOGAF
AWS Certified Solutions Architect
PRINCE2
Scrum Master
```

| Field | Priority | Required | Rationale |
|---|---|---:|---|
| Certification name | P1 | No | Frequently appears as a consultant requirement. |
| Issuer | P1 | No | Provides validation context. |
| Expiry | P1 | No | Prevents expired credentials being treated as valid. |
| Evidence | P2 | No | Improves qualification confidence. |

---

## 6.10 Languages

Fields:

```text
Language
Reading
Writing
Speaking
Overall proficiency
```

| Field | Priority | Required | Rationale |
|---|---|---:|---|
| Language | P1 | No | Some assignments require local or international language proficiency. |
| Proficiency | P1 | No | Supports explicit language criteria. |

---

## 6.11 Availability

Fields:

```text
Available from
Engagement type
Remote / on-site / hybrid
Travel willingness
```

Possible engagement types:

```text
Full-time consultancy
Part-time consultancy
Short-term assignment
Remote
On-site
```

| Field | Priority | Required | Rationale |
|---|---|---:|---|
| Availability type | P2 | No | Reduces irrelevant consultant opportunities. |
| Available from | P2 | No | Useful for short-deadline assignments. |

---

## 6.12 Individual Evidence

Possible evidence:

```text
CV
Academic certificate
Professional certificate
Reference letter
Completion certificate
Employment letter
Portfolio
```

Important extracted-evidence fields:

```text
document
source page
extracted fact
confidence
user confirmed
```

---

# 7. Individual Tender Preferences

Preferences answer:

> What opportunities does this person want TenderSense to look for?

## Geography
```text
Preferred countries
Preferred regions
Excluded countries
```

## Sources
```text
World Bank
Bangladesh e-GP
ADB
UNGM
Other supported sources
```

## Assignment types
```text
Individual Consultant
Consulting Services
EOI
RFP
Short-term consultancy
Long-term consultancy
```

## Sector
```text
Government
Banking
Education
ICT
etc.
```

## Expertise
```text
Preferred service categories
Keywords
Excluded keywords
```

## Timeline
```text
Minimum days remaining
```

## Compensation / contract preference
Optional:

```text
Minimum fee
Preferred value range
Currency
```

**Rationale:** A consultant may be capable of software development but only want strategy or consulting opportunities.

---

# 8. Individual Onboarding — P0 Fields

Collect only:

```text
Full name
Country
Professional headline
Total years of experience
Primary expertise
Skills
Sectors
Preferred countries
Preferred opportunity types
Preferred procurement sources
```

Do not force completion of projects, education, certifications, and evidence before showing the first feed.

---

# 9. Individual Progressive Profiling

After the first feed, prompt:

```text
Add past assignments
→ improve experience matching

Add education
→ improve consultant eligibility checks

Add certifications
→ improve qualification accuracy

Add countries worked in
→ improve international assignment matching
```

---

# 10. Organization Profile — Purpose

The Organization Profile is intended for:

- software companies,
- consulting firms,
- engineering companies,
- NGOs,
- suppliers,
- contractors,
- professional-services organizations,
- enterprises such as BRAC IT.

It must support both:

```text
Tender discovery
and
Formal eligibility assessment
```

Core model:

```text
Services
+ Sector Experience
+ Geographic Experience
+ Past Projects
+ Clients
+ Credentials
+ Financial Capacity
+ Workforce
+ Tender Preferences
+ Evidence
```

---

# 11. Organization Profile Structure

```text
Organization Profile

├── Organization Identity
├── Services & Capabilities
├── Technologies
├── Sector Experience
├── Geographic Experience
├── Project Experience
├── Client Experience
├── Certifications & Credentials
├── Legal Information
├── Financial Capacity
├── Workforce & Key Experts
├── Partnerships
├── Evidence
└── Tender Preferences
```

---

# 12. Organization Identity

Fields:

```text
Legal name
Trading name
Organization type
Country of registration
Registration number
Year established
Headquarters
Website
Employee range
Ownership type
```

| Field | Priority | Required | Rationale |
|---|---|---:|---|
| Legal name | P0 | Yes | Required for official organization identity. |
| Trading name | P1 | No | Useful when operating under a brand name. |
| Organization type | P0 | Yes | Helps distinguish company, NGO, partnership, etc. |
| Country of registration | P0 | Yes | Core geographic/legal signal. |
| Year established | P1 | No | Enables years-in-operation calculation. |
| Registration number | P2 | No | Qualification evidence, not needed for discovery. |
| Headquarters | P1 | No | Useful for local-presence requirements. |
| Website | P1 | No | Supporting organization context. |
| Employee range | P1 | No | Rough delivery-capacity signal. |

---

# 13. Services & Capabilities

Use structured taxonomy.

Example groups:

## Software & Digital
```text
Custom Software Development
Enterprise Applications
ERP
HRMIS
Financial Management Systems
Mobile Applications
SaaS
System Integration
API Development
Digital Platforms
```

## Infrastructure
```text
Cloud
DevOps
Networking
Data Center
Cybersecurity
Managed Services
```

## Consulting
```text
Digital Transformation
Business Analysis
Product Management
UX/UI
Enterprise Architecture
IT Strategy
Implementation Consulting
```

## Data
```text
Data Engineering
Analytics
Business Intelligence
AI/ML
Data Governance
```

Fields per capability:

```text
Capability
Primary / Secondary
Years experience
Number of projects
Evidence count
```

| Field | Priority | Required | Rationale |
|---|---|---:|---|
| Capability | P0 | Yes | Primary discovery signal. |
| Primary/secondary | P0 | Yes | Prevents weak side-capabilities from matching too strongly. |
| Years experience | P1 | No | Supports experience thresholds. |
| Project count | P1 | No | Strong qualification signal. |
| Evidence count | Derived | No | Supports confidence. |

---

# 14. Technologies

Examples:

```text
Angular
React
Next.js
Java
.NET
Node.js
PostgreSQL
Oracle
AWS
Azure
Kubernetes
Power BI
SAP
```

| Field | Priority | Required | Rationale |
|---|---|---:|---|
| Technology | P1 | No | Useful for technical-scope matching. |
| Years experience | P2 | No | Supports explicit minimum-experience requirements. |
| Project count | P2 | No | Strengthens evidence. |

**Rule:** Technologies should influence matching only when the tender actually makes them relevant.

---

# 15. Sector Experience

Fields:

```text
Sector
Years experience
Number of projects
Countries
Major clients
Total contract value optional
```

Examples:

```text
Government
Banking
Microfinance
NGO
Education
Healthcare
Agriculture
RMG
Telecommunications
Fintech
Energy
```

| Field | Priority | Required | Rationale |
|---|---|---:|---|
| Sector | P0 | Yes | Strong opportunity-fit signal. |
| Years | P1 | No | Supports sector-experience criteria. |
| Project count | P1 | No | Stronger evidence than a tag alone. |
| Countries | P2 | No | Useful for international sector experience. |

---

# 16. Geographic Experience

Separate:

```text
Markets the organization wants
from
Markets where it has proven delivery experience
```

Fields:

```text
Country
Number of projects
Years active
Sectors
Total project value optional
```

| Field | Priority | Required | Rationale |
|---|---|---:|---|
| Proven project countries | P1 | No | Supports geographic eligibility. |
| Project count by country | P2 | No | Strengthens evidence. |
| Years active | P2 | No | Useful for local-market requirements. |

---

# 17. Past Project Experience

This is one of the most important Pro profile areas.

Fields:

```text
Project name
Client
Client type
Country
Sector
Start date
Completion date
Contract value
Currency
Role
Prime contractor / subcontractor / consortium
Services delivered
Technologies
Scope
Scale
Status
Reference
Supporting documents
```

| Field | Priority | Required | Rationale |
|---|---|---:|---|
| Project name | P1 | No | Identifies relevant evidence. |
| Client | P1 | No | Important credibility/client-type signal. |
| Client type | P1 | No | Government/bank/NGO experience often matters. |
| Country | P1 | No | Supports geographic criteria. |
| Sector | P1 | No | Supports sector criteria. |
| Dates | P1 | No | Enables “within last X years” calculations. |
| Contract value | P2 | No | Critical for similar-contract-value criteria. |
| Role | P1 | No | Distinguishes prime contractor from subcontractor. |
| Services | P1 | No | Core similarity signal. |
| Technologies | P2 | No | Technical similarity. |
| Scope/scale | P2 | No | Useful for complexity comparisons. |
| Evidence | P2 | No | Improves qualification confidence. |

Derived fields:

```text
Project duration
Project age
Normalized contract value
Similarity tags
Relevant capability tags
```

---

# 18. Client Experience

Maintain a derived client directory:

```text
Client name
Client type
Country
Sector
Number of projects
Total project value
First engagement
Latest engagement
```

Client types:

```text
Government
International Development Organization
Bank
Financial Institution
NGO
Private Enterprise
Multinational
```

**Rationale:** A company with ERP experience for private companies is not equivalent to one with ERP experience for government agencies.

---

# 19. Certifications & Credentials

Credential types:

```text
ISO Certification
Business License
Professional Accreditation
Government Enlistment
Technology Partnership
Membership
Security Certification
Award
```

Fields:

```text
Credential type
Name
Issuer
Credential number
Issue date
Expiry date
Status
Country
Evidence document
```

| Field | Priority | Required | Rationale |
|---|---|---:|---|
| Credential name | P1 | No | Formal eligibility often requires specific credentials. |
| Type | P1 | No | Helps classification. |
| Issuer | P1 | No | Verification context. |
| Expiry | P1 | No | Prevents expired evidence being treated as valid. |
| Evidence | P2 | No | Improves qualification confidence. |

---

# 20. Legal Information

Fields:

```text
Registration number
Tax/VAT number
Trade/business license
Legal entity type
Country of registration
Years in operation
Government vendor registration optional
```

| Field | Priority | Required | Rationale |
|---|---|---:|---|
| Legal entity type | P1 | No | Some tenders restrict eligible entity types. |
| Registration information | P2 | No | Useful for formal qualification. |
| Trade/business license | P2 | No | Common local eligibility requirement. |
| Tax/VAT registration | P2 | No | Common legal compliance requirement. |

**Security:** Do not expose sensitive legal identifiers in public/feed APIs.

---

# 21. Financial Capacity

These fields are sensitive and should be optional/private.

Fields:

```text
Annual turnover by year
Currency
Average turnover
Net worth
Liquid assets
Credit facility
Largest completed contract
Largest ongoing contract
Audited financial years available
```

| Field | Priority | Required | Rationale |
|---|---|---:|---|
| Annual turnover | P2 | No | Common formal eligibility criterion. |
| Average turnover | Derived | No | Used for multi-year threshold checks. |
| Liquid assets / credit | P2 | No | Common works/goods requirement. |
| Largest contract | P2 | No | Useful for similar-contract-size qualification. |
| Audited years | P2 | No | Indicates evidence availability. |

Example:

```text
Tender requirement:
3-year average turnover >= BDT 500M

Organization:
3-year average = BDT 1.8B

Result:
Meets — 3.6× threshold
```

---

# 22. Workforce & Key Experts

High-level workforce fields:

```text
Total employees
Engineers
Project managers
Business analysts
UX designers
QA engineers
DevOps engineers
Security specialists
Data engineers
Other specialist groups
```

| Field | Priority | Required | Rationale |
|---|---|---:|---|
| Total employee range | P1 | No | Rough capacity indicator. |
| Role counts | P2 | No | Useful where tender requests minimum team capacity. |

For selected key experts, reuse a lightweight individual profile:

```text
Name
Role
Years experience
Education
Certifications
Sector experience
Relevant projects
Availability
```

---

# 23. Partnerships / Consortium Capability

Fields:

```text
Partner name
Partner type
Country
Capabilities
Relationship type
Active / inactive
Evidence
```

Relationship types:

```text
Technology partner
Implementation partner
Consortium partner
Local partner
Subcontractor
```

| Field | Priority | Required | Rationale |
|---|---|---:|---|
| Partner capability | P3 | No | Useful for opportunities requiring missing capabilities. |
| Country | P3 | No | Helps with local-partner requirements. |

Not essential for first MVP.

---

# 24. Organization Evidence

Evidence types:

```text
Company profile
Registration document
Trade license
Tax document
ISO certificate
Completion certificate
Contract
Purchase order
Client reference
Audited financial statement
Bank certificate
Project case study
Employee CV
Partnership certificate
```

For important extracted facts, store:

```text
source document
page
source excerpt
extraction method
confidence
user confirmed
```

**Rationale:** TenderSense should be able to explain where a qualification claim came from.

---

# 25. Organization Tender Preferences

## Geography
```text
Preferred countries
Preferred regions
Excluded countries
```

## Procurement sources
```text
World Bank
Bangladesh e-GP
BPPA
ADB
UNGM
Other supported sources
```

## Procurement category
```text
Goods
Works
Consulting Services
Non-consulting Services
Physical Services
```

## Opportunity type
```text
RFP
EOI
RFQ
Invitation for Bid
Prequalification
Consultancy
```

## Sector
```text
Government
ICT
Banking
Microfinance
Education
etc.
```

## Service focus
```text
ERP
Digital Transformation
Cloud
Cybersecurity
Managed Services
etc.
```

## Contract value
```text
Minimum preferred contract value
Maximum preferred contract value
Currency
```

## Timeline
```text
Minimum days remaining
```

## Keywords
```text
Included keywords
Excluded keywords
```

**Rationale:** A capable organization should not receive every opportunity it could technically perform.

---

# 26. Organization Onboarding — P0 Fields

Collect only:

```text
Organization name
Organization type
Country
Primary services/capabilities
Primary sectors
Preferred countries
Preferred procurement sources
Preferred opportunity types
Minimum preparation window
```

Do not block onboarding on:

```text
financial information
certifications
project history
documents
team details
legal documents
```

---

# 27. Organization Progressive Profiling

After the initial feed:

```text
Add 3 past projects
→ improve experience matching

Add certifications
→ improve formal eligibility checks

Add contract values
→ evaluate similar-project thresholds

Add turnover data
→ evaluate financial eligibility

Upload supporting documents
→ increase qualification confidence
```

---

# 28. Free vs Pro Profile Depth

## Individual

| Profile capability | Free | Pro/Future |
|---|---:|---:|
| Identity | Yes | Yes |
| Expertise | Yes | Yes |
| Skills | Yes | Yes |
| Sectors | Yes | Yes |
| Years experience | Yes | Yes |
| Manual projects | Limited | Full |
| Education | Yes | Yes |
| Certifications | Basic | Full |
| Tender preferences | Yes | Advanced |
| Document evidence | No | Yes |
| Evidence extraction | No | Yes |
| Requirement-evidence matching | Limited | Full |

## Organization

| Profile capability | Free | Pro |
|---|---:|---:|
| Organization basics | Yes | Yes |
| Services | Yes | Yes |
| Sectors | Yes | Yes |
| Countries | Yes | Yes |
| Technologies | Yes | Yes |
| Preferences | Yes | Yes |
| Past projects | Limited/manual | Full |
| Client history | Basic | Detailed |
| Certifications | Basic/manual | Detailed |
| Contract values | Limited | Yes |
| Financial history | No | Yes |
| Workforce | No | Yes |
| Key experts | No | Yes |
| Evidence documents | No | Yes |
| Document extraction | No | Yes |
| Provenance | No | Yes |
| Requirement-evidence matching | Limited | Yes |

---

# 29. Profile Completeness

Completeness should represent useful matching information, not arbitrary form completion.

## Individual suggested weighting

```text
Identity                  10%
Expertise                 20%
Skills                    15%
Sector experience         10%
Years experience          10%
Projects                  15%
Education                  5%
Certifications             5%
Geographic experience      5%
Tender preferences         5%
                         ----
                         100%
```

## Organization suggested weighting

```text
Organization identity     10%
Services/capabilities     20%
Sector experience         10%
Geographic experience     10%
Past projects             20%
Credentials               10%
Financial information      5%
Workforce                  5%
Tender preferences        10%
                         ----
                         100%
```

Free users should have plan-aware completeness so Pro-only fields do not make their profile appear permanently incomplete.

---

# 30. Profile Confidence

Completeness and confidence are different.

Example:

```text
Profile completeness: 90%
Evidence confidence: 42%
```

Suggested confidence interpretation:

```text
Manual statement        Low/Medium
Structured project      Medium
Uploaded evidence       High
User-confirmed extract  High
```

This distinction should eventually be visible in Pro assessment results.

---

# 31. Recommended Matching Inputs

## Individual Opportunity Fit

```text
Primary expertise           25
Skill match                 15
Sector                      15
Geography                   10
Past assignment similarity  15
Opportunity type            10
Source preference            5
Timeline                     5
                           ----
                           100
```

## Organization Opportunity Fit

```text
Service/capability match    25
Sector match                15
Past project similarity     20
Geographic match            10
Technology match             5
Opportunity type             5
Source preference            5
Contract-value preference   10
Timeline                     5
                           ----
                           100
```

These are initial MVP weights and should be tuned after pilot feedback.

---

# 32. Recommended Qualification Inputs

## Individual

```text
Years experience
Education
Relevant assignment count
Assignment recency
Sector experience
Geographic experience
Certifications
Languages
Availability
```

## Organization

```text
Years in operation
Similar-project count
Similar-project values
Project recency
Sector experience
Geographic experience
Legal eligibility
Certifications
Financial thresholds
Team/key expert requirements
Required documents
```

---

# 33. Example — Individual Match

Profile:

```text
ERP Business Analyst
10 years experience

Sectors:
Government
Banking
Microfinance

Countries:
Bangladesh
Nepal

Skills:
Business Analysis
ERP
Requirements Engineering
UAT

Education:
BSc Computer Science

Certification:
CBAP
```

Opportunity:

```text
World Bank
Individual Consultant — ERP Business Analyst
Bangladesh
Minimum 8 years experience
Government ERP experience required
```

Result:

```text
Opportunity Fit
94% — Strong Fit

Why:
✓ ERP Business Analysis
✓ Government-sector experience
✓ Bangladesh
✓ 10 years experience

Qualification
Likely Eligible

✓ Minimum 8 years — Meets
✓ Relevant sector — Meets
✓ Degree requirement — Meets
△ Specific donor-project experience — Needs Verification
```

---

# 34. Example — Organization Match

Profile:

```text
BRAC IT

Capabilities:
ERP
Enterprise Applications
Digital Transformation
Financial Systems

Sectors:
Government
Banking
Microfinance
NGO

Relevant Projects:
8 ERP implementations

Credentials:
ISO 27001

Geographic Experience:
Bangladesh
Nepal
```

Opportunity:

```text
Government ERP Modernization

Required:
3 similar ERP implementations in last 5 years
ISO 27001
2 international projects
3-year average turnover >= threshold
```

Result:

```text
Opportunity Fit
92% — Strong Fit

Qualification
79% — Potentially Eligible

Meets
✓ ERP experience
✓ 5 qualifying recent projects
✓ ISO 27001

Needs Verification
△ Financial turnover threshold

Gap
✕ 2 international projects required
  1 currently identified
```

---

# 35. UX Principle — Do Not Build a Giant Form

Individual profile navigation:

```text
Profile

Overview
Expertise
Experience
Education & Credentials
Evidence
Preferences
```

Organization profile navigation:

```text
Profile

Overview
Capabilities
Experience
Credentials
Financial
People
Evidence
Preferences
```

---

# 36. UX Principle — Explain Why a Field Matters

Bad:

```text
Complete your profile.
```

Better:

```text
Add past projects
TenderSense can then identify tenders requiring similar project experience.
```

Bad:

```text
Add financial data.
```

Better:

```text
Add annual turnover
TenderSense can automatically check minimum-turnover requirements.
```

---

# 37. UX Principle — Sensitive Data Is Optional

Sensitive organization data should not be required for discovery.

Examples:

```text
financial turnover
credit line
tax identifiers
registration documents
employee CVs
confidential contracts
```

Users should understand:

```text
why TenderSense needs it
who can see it
how it is used
whether AI processes it
```

---

# 38. UX Principle — Unknown Is Not Failure

When profile data is missing, use:

```text
Needs Verification
```

Do not use:

```text
Failed
Not Eligible
Gap
```

unless available evidence supports that conclusion.

---

# 39. Product Principle — Profile Improves Over Time

```text
Onboarding
   ↓
Initial Profile
   ↓
First Opportunities
   ↓
Profile Gaps Identified
   ↓
Add Projects / Evidence
   ↓
Better Assessment
   ↓
Tender Decisions
   ↓
Profile Continues Improving
```

The profile should become reusable organizational or professional memory.

---

# 40. MVP Scope Recommendation

## Individual MVP

Must support:

```text
Identity
Headline
Years experience
Expertise
Skills
Sectors
Countries
Basic projects
Education
Certifications
Preferences
```

Can postpone:

```text
document extraction
references
advanced availability
complex credential verification
```

## Organization MVP

Must support:

```text
Identity
Capabilities
Sectors
Technologies
Geographic experience
Projects
Credentials
Tender preferences
```

Pro should additionally support:

```text
Evidence documents
Financial capacity
Detailed project values
Key experts
Requirement-to-evidence links
```

---

# 41. Recommended Database Mapping

Individual:

```text
individual_profiles
workspace_capabilities
projects
credentials
monitoring_profiles
evidence_documents
```

Organization:

```text
organization_profiles
workspace_capabilities
projects
credentials
monitoring_profiles
evidence_documents
workspace_members
```

Possible future tables:

```text
education_records
language_skills
organization_financials
key_experts
project_references
partnerships
```

**Rule:** Use structured tables for data that is matched, filtered, scored, reported, or frequently updated. Use JSONB only for lower-value optional metadata.

---

# 42. Implementation Rules for AI Builders

1. Do not create a single unstructured `profile_json` as the primary matching source.
2. Store core matching attributes in structured columns/tables.
3. Keep capability and preference data separate.
4. Keep evidence/provenance separate from claims.
5. Do not require Pro-only information during Free onboarding.
6. Calculate derived values such as years in operation instead of asking twice.
7. Preserve `Needs Verification` when information is unknown.
8. Allow profile data to evolve without forcing users to repeat onboarding.
9. Make sensitive data private by default.
10. Do not expose financial/legal evidence in public APIs.

---

# 43. Final Profile Model

The simplest mental model is:

```text
WHO ARE YOU?
        ↓
WHAT CAN YOU DO?
        ↓
WHERE HAVE YOU DONE IT?
        ↓
WHAT HAVE YOU DONE BEFORE?
        ↓
WHAT PROVES IT?
        ↓
WHAT OPPORTUNITIES DO YOU WANT?
```

For organizations:

```text
CAN YOU LEGALLY / FINANCIALLY QUALIFY?
        ↓
DO YOU HAVE THE PEOPLE AND CREDENTIALS?
```

TenderSense should transform:

```text
"We found a tender."
```

into:

```text
"We found a tender that fits what you do,
matches the markets you want,
resembles work you have completed,
and appears to satisfy most eligibility criteria.

Here is what we can prove,
what still needs verification,
and what may prevent qualification."
```

That is the purpose of the TenderSense profile.

---

# 44. Change Log

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-09-12 | Initial Individual and Organization Profile Plan |

---

# END OF PROFILE PLAN
