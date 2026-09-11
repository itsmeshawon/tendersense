-- 0007 Sources registry (SoT §16.12)
--
-- One row per procurement data source. Adapter code reads from and
-- writes to this table (last_successful_sync_at, cursor in
-- configuration jsonb). Human-facing metadata (name, base_url) is
-- displayed on opportunity detail views.

create table public.sources (
  key                       text primary key,
  name                      text not null,
  base_url                  text not null,
  source_type               text not null check (source_type in ('api', 'html', 'rss')),
  enabled                   boolean not null default true,
  ingestion_mode            text not null check (ingestion_mode in ('cron', 'on_demand')),
  configuration             jsonb not null default '{}'::jsonb,
  last_successful_sync_at   timestamptz,
  created_at                timestamptz not null default now()
);

-- Seed the two adapters Phase 1 covers.
--   world_bank  — cron, JSON API
--   bd_egp      — cron, HTML scrape (e-GP tender notices)
--
-- eExperience is not a source_record producer; it's an on-demand
-- lookup surface. No row here.
insert into public.sources (key, name, base_url, source_type, ingestion_mode, configuration) values
  ('world_bank', 'World Bank Procurement Notices',
   'https://datacatalogapi.worldbank.org/dexapps/fone/api/apiservice',
   'api', 'cron',
   '{"datasetId":"DS00979","resourceId":"RS00909","pageSize":1000,"backfillDays":180}'::jsonb),
  ('bd_egp',     'Bangladesh e-GP Tender Notices',
   'https://www.eprocure.gov.bd/resources/common/StdTenderSearch.jsp?h=t',
   'html', 'cron',
   '{"pageSize":25,"detailRequestDelayMs":3000,"userAgent":"TenderSenseBot/0.1 (+https://tendersense.app; contact=support@tendersense.app)"}'::jsonb);

-- No RLS: `sources` is server-only metadata. Adapter jobs run as
-- service_role which bypasses RLS. Authenticated users never query
-- this table directly.
alter table public.sources enable row level security;
-- (no policies -> no client access)

grant select, insert, update, delete on table public.sources to service_role;
