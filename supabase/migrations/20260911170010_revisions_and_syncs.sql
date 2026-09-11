-- 0010 Opportunity revisions + sync-run bookkeeping
--
-- opportunity_revisions (SoT §16.15): one row per detected material
-- change to an opportunity. The ingestion runner compares content
-- hashes and writes a revision + diff when they change (SoT §26).
-- Amendment alerts (Phase 6) read from this table.
--
-- source_sync_runs (SoT §13): one row per ingestion tick. Recorded
-- before the run starts (status='running'), updated on completion
-- (success | partial | failed) with counts. Watermark is only
-- advanced on success or safely partial.

create table public.opportunity_revisions (
  id               uuid primary key default gen_random_uuid(),
  opportunity_id   uuid not null references public.opportunities(id) on delete cascade,
  revision_no      int  not null,
  previous_hash    text,
  new_hash         text not null,
  changed_fields   text[] not null default '{}',
  change_snapshot  jsonb not null default '{}'::jsonb,
  detected_at      timestamptz not null default now(),

  unique (opportunity_id, revision_no)
);

create index opportunity_revisions_opportunity_idx
  on public.opportunity_revisions (opportunity_id, detected_at desc);

alter table public.opportunity_revisions enable row level security;

-- Authenticated users can read revisions (same rationale as opportunities:
-- public info about public procurement notices).
create policy opportunity_revisions_authenticated_select
  on public.opportunity_revisions
  for select
  using (auth.uid() is not null);

grant select on table public.opportunity_revisions to authenticated;
grant select, insert, update, delete on table public.opportunity_revisions to service_role;

-- ---------------------------------------------------------------
-- source_sync_runs
-- ---------------------------------------------------------------
create table public.source_sync_runs (
  id                  uuid primary key default gen_random_uuid(),
  source_key          text not null references public.sources(key),

  started_at          timestamptz not null default now(),
  finished_at         timestamptz,

  status              text not null check (status in ('running','success','partial','failed')),
  cursor              jsonb not null default '{}'::jsonb,

  records_fetched     int not null default 0,
  records_created     int not null default 0,
  records_updated     int not null default 0,
  records_unchanged   int not null default 0,
  records_failed      int not null default 0,

  error_summary       text,
  created_at          timestamptz not null default now()
);

create index source_sync_runs_source_started_idx
  on public.source_sync_runs (source_key, started_at desc);

-- Server-only. Adapter status page for admins comes later; for now
-- no client access.
alter table public.source_sync_runs enable row level security;

grant select, insert, update, delete on table public.source_sync_runs to service_role;
