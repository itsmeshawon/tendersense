-- Local dev seed. Applied by `supabase db reset --local`. Not applied to hosted.
-- Hosted `tendersense` runs `supabase db push` which never touches seed.sql.
--
-- Two things live here:
--   1. Signup allowlist so devs + demo emails can log in on local
--   2. Sample opportunities so /opportunities has something to render
--      before the WB/e-GP adapters run
--
-- Do NOT put anything here that must appear on hosted. Hosted seeding is
-- a separate concern (adapter cron jobs populate `public.opportunities`).

-- ---------------------------------------------------------------
-- Signup allowlist
-- ---------------------------------------------------------------

insert into public.allowed_signup_emails (email, note) values
  ('mahedisalim@gmail.com',  'founder / dev'),
  ('mohabbat2099@gmail.com', 'teammate / engineer')
on conflict (email) do nothing;

-- ---------------------------------------------------------------
-- Sample opportunities (local dev only)
--
-- Ten rows: a mix of Bangladesh e-GP and World Bank notices with real-
-- looking fields, staggered publication and deadline dates, one Ongoing
-- revision to demonstrate the amendment path.
--
-- Dates are relative-ish to 2026-09-12 so "days remaining" renders
-- interesting values.
-- ---------------------------------------------------------------

insert into public.opportunities (
  source_key, external_id, source_url, title, description,
  notice_type, procurement_category, procurement_method,
  country_code, country_name, region, district,
  issuer_name, ministry_name, agency_name, procuring_entity_name,
  project_id, reference_no,
  sector, tags,
  publication_at, deadline_at,
  currency, estimated_value_min, estimated_value_max,
  status, language, content_hash, source_updated_at
) values

-- e-GP row 1: near-deadline ICT tender
(
  'bd_egp', 'BD_EGP:200001',
  'https://www.eprocure.gov.bd/resources/common/VieweTender.jsp?id=200001',
  'Supply and Installation of Data Center Infrastructure',
  'Complete data-center refresh at the Directorate General of Health Services including UPS, cooling, and rack systems.',
  'Invitation for Tender', 'Goods', 'OTM',
  'BD', 'Bangladesh', 'Dhaka', 'Dhaka',
  'Government of Bangladesh', 'Ministry of Health', 'Directorate General of Health Services', 'ICT Wing',
  null, 'DGHS/ICT/2026/007',
  array['ICT','Healthcare'], array['bd','urgent'],
  '2026-09-01T04:00:00Z', '2026-09-25T09:00:00Z',
  'BDT', 45000000, 55000000,
  'open', 'en', md5('BD_EGP:200001'), '2026-09-01T04:00:00Z'
),

-- e-GP row 2: consulting services
(
  'bd_egp', 'BD_EGP:200002',
  'https://www.eprocure.gov.bd/resources/common/VieweTender.jsp?id=200002',
  'Consultancy Services for Financial Management System',
  'Design, develop, and roll out an integrated financial management system across Bangladesh Krishi Bank branches.',
  'Request for Proposal', 'Services', 'DTM',
  'BD', 'Bangladesh', 'Dhaka', null,
  'Government of Bangladesh', 'Bank and Financial Institutions Division', 'Bangladesh Krishi Bank', 'ICT Operation Department',
  null, 'BKB/ICT/2026/012',
  array['ICT','Financial Services'], array['bd'],
  '2026-08-28T06:00:00Z', '2026-10-05T10:00:00Z',
  'BDT', 120000000, 180000000,
  'open', 'en', md5('BD_EGP:200002'), '2026-08-28T06:00:00Z'
),

-- e-GP row 3: works tender
(
  'bd_egp', 'BD_EGP:200003',
  'https://www.eprocure.gov.bd/resources/common/VieweTender.jsp?id=200003',
  'Construction of Rural Health Complex — Kishoreganj',
  'Turnkey construction of a 50-bed rural health complex under the Health Services Division.',
  'Invitation for Tender', 'Works', 'OTM',
  'BD', 'Bangladesh', 'Dhaka', 'Kishoreganj',
  'Government of Bangladesh', 'Ministry of Health', 'Health Engineering Department', null,
  null, 'HED/KISH/2026/003',
  array['Construction','Healthcare'], array['bd','works'],
  '2026-09-05T05:00:00Z', '2026-10-15T10:00:00Z',
  'BDT', 320000000, 380000000,
  'open', 'en', md5('BD_EGP:200003'), '2026-09-05T05:00:00Z'
),

-- e-GP row 4: small goods
(
  'bd_egp', 'BD_EGP:200004',
  'https://www.eprocure.gov.bd/resources/common/VieweTender.jsp?id=200004',
  'Procurement of Laptops for Field Staff',
  'Supply of 500 business-class laptops for BRDB field-level staff across 64 districts.',
  'Invitation for Tender', 'Goods', 'LTM',
  'BD', 'Bangladesh', null, null,
  'Government of Bangladesh', 'Ministry of Local Government', 'Bangladesh Rural Development Board', null,
  null, 'BRDB/GOODS/2026/041',
  array['ICT'], array['bd','goods'],
  '2026-09-08T07:00:00Z', '2026-09-22T09:30:00Z',
  'BDT', 35000000, 42000000,
  'open', 'en', md5('BD_EGP:200004'), '2026-09-08T07:00:00Z'
),

-- e-GP row 5: recently amended (revision inserted below)
(
  'bd_egp', 'BD_EGP:200005',
  'https://www.eprocure.gov.bd/resources/common/VieweTender.jsp?id=200005',
  'Enterprise Resource Planning for BADC',
  'Full ERP implementation covering finance, HR, procurement, and asset management modules.',
  'Request for Proposal', 'Services', 'DTM',
  'BD', 'Bangladesh', 'Dhaka', null,
  'Government of Bangladesh', 'Ministry of Agriculture', 'Bangladesh Agricultural Development Corporation', 'MIS Wing',
  null, 'BADC/ERP/2026/002',
  array['ICT','Agriculture'], array['bd','erp'],
  '2026-08-15T06:00:00Z', '2026-10-08T10:00:00Z',
  'BDT', 220000000, 280000000,
  'open', 'en', md5('BD_EGP:200005') || '-v2', '2026-09-10T06:00:00Z'
),

-- World Bank row 1
(
  'world_bank', 'WORLD_BANK:wb-9001',
  'https://projects.worldbank.org/en/projects-operations/procurement-detail/wb-9001',
  'Bangladesh — Digital Government Modernization Program',
  'Advisory and system-integration services for phased modernization of Bangladeshi government e-services.',
  'Request for Expressions of Interest', 'Consulting Services', 'QCBS',
  'BD', 'Bangladesh', 'South Asia', null,
  'World Bank', null, 'World Bank Country Office Dhaka', null,
  'P177942', 'WB-BD-DGMP-2026-001',
  array['ICT','Public Sector'], array['worldbank','digital-gov'],
  '2026-09-02T00:00:00Z', '2026-10-20T23:59:00Z',
  'USD', 2500000, 4000000,
  'open', 'en', md5('WORLD_BANK:wb-9001'), '2026-09-02T00:00:00Z'
),

-- World Bank row 2
(
  'world_bank', 'WORLD_BANK:wb-9002',
  'https://projects.worldbank.org/en/projects-operations/procurement-detail/wb-9002',
  'Nepal — Road Safety Investment Project',
  'Design and supervision consultant for the Highway Safety Upgrade in the Kathmandu-Pokhara corridor.',
  'Request for Proposals', 'Consulting Services', 'FBS',
  'NP', 'Nepal', 'South Asia', null,
  'World Bank', null, 'World Bank Country Office Kathmandu', null,
  'P178001', 'WB-NP-RS-2026-004',
  array['Transportation'], array['worldbank','regional'],
  '2026-09-06T00:00:00Z', '2026-10-30T23:59:00Z',
  'USD', 3000000, 5500000,
  'open', 'en', md5('WORLD_BANK:wb-9002'), '2026-09-06T00:00:00Z'
),

-- World Bank row 3: closed (past deadline, kept to test status filters later)
(
  'world_bank', 'WORLD_BANK:wb-9003',
  'https://projects.worldbank.org/en/projects-operations/procurement-detail/wb-9003',
  'Bangladesh — Coastal Embankment Rehabilitation',
  'Works contract for the rehabilitation of coastal embankments in Barguna and Patuakhali districts.',
  'Invitation for Bids', 'Works', 'ICB',
  'BD', 'Bangladesh', 'South Asia', 'Barguna',
  'World Bank', null, 'World Bank Country Office Dhaka', null,
  'P178042', 'WB-BD-CE-2026-007',
  array['Construction','Climate'], array['worldbank','closed'],
  '2026-06-10T00:00:00Z', '2026-08-01T23:59:00Z',
  'USD', 12000000, 18000000,
  'closed', 'en', md5('WORLD_BANK:wb-9003'), '2026-08-02T00:00:00Z'
),

-- World Bank row 4: SME-scale services
(
  'world_bank', 'WORLD_BANK:wb-9004',
  'https://projects.worldbank.org/en/projects-operations/procurement-detail/wb-9004',
  'Sri Lanka — Public Financial Management Assessment',
  'Individual consultant assignment for a diagnostic assessment of Sri Lankan PFM systems.',
  'Individual Consultant Notice', 'Consulting Services', 'IC',
  'LK', 'Sri Lanka', 'South Asia', null,
  'World Bank', null, 'World Bank Country Office Colombo', null,
  'P178080', 'WB-LK-PFM-2026-002',
  array['Public Finance'], array['worldbank','individual'],
  '2026-09-09T00:00:00Z', '2026-09-28T23:59:00Z',
  'USD', 40000, 80000,
  'open', 'en', md5('WORLD_BANK:wb-9004'), '2026-09-09T00:00:00Z'
),

-- World Bank row 5: near-deadline
(
  'world_bank', 'WORLD_BANK:wb-9005',
  'https://projects.worldbank.org/en/projects-operations/procurement-detail/wb-9005',
  'Bangladesh — Third-Party Monitoring for Education Reforms',
  'Independent monitoring and verification services for the Secondary Education Development Program.',
  'Request for Expressions of Interest', 'Consulting Services', 'QCBS',
  'BD', 'Bangladesh', 'South Asia', null,
  'World Bank', null, 'World Bank Country Office Dhaka', null,
  'P178099', 'WB-BD-EDU-2026-011',
  array['Education','Monitoring & Evaluation'], array['worldbank','mne'],
  '2026-09-04T00:00:00Z', '2026-09-24T23:59:00Z',
  'USD', 800000, 1500000,
  'open', 'en', md5('WORLD_BANK:wb-9005'), '2026-09-04T00:00:00Z'
)

on conflict (source_key, external_id) do nothing;

-- ---------------------------------------------------------------
-- One sample amendment (opportunity_revisions) to prove the flow.
-- BADC ERP tender (BD_EGP:200005) had its deadline extended.
-- ---------------------------------------------------------------

insert into public.opportunity_revisions (
  opportunity_id, revision_no, previous_hash, new_hash,
  changed_fields, change_snapshot, detected_at
)
select
  o.id, 1, md5('BD_EGP:200005'), md5('BD_EGP:200005') || '-v2',
  array['deadline_at'],
  jsonb_build_object(
    'deadline_at', jsonb_build_object(
      'from', '2026-09-25T10:00:00Z',
      'to',   '2026-10-08T10:00:00Z'
    )
  ),
  '2026-09-10T06:00:00Z'
from public.opportunities o
where o.source_key = 'bd_egp' and o.external_id = 'BD_EGP:200005'
on conflict (opportunity_id, revision_no) do nothing;
