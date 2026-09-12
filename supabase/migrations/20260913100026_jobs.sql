-- 0026 jobs — async work queue
--
-- SoT §88 + Phase 4 §2e. MVP job types:
--   document.extract  — parse uploaded evidence into extracted_text
--
-- Worker leases rows via `select … for update skip locked`. Cron
-- workflow runs every 5 minutes. Concurrency guard in the workflow so
-- only one worker at a time.

create table public.jobs (
  id            uuid primary key default gen_random_uuid(),
  type          text not null,
  payload       jsonb not null default '{}'::jsonb,
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

create index jobs_available_idx
  on public.jobs (available_at)
  where status = 'queued';

create index jobs_type_idx on public.jobs (type);

-- Jobs table is entirely service-role owned. No client access.
alter table public.jobs enable row level security;
-- No policies — RLS with no policies = deny-all for authenticated.
grant select, insert, update, delete on table public.jobs to service_role;
