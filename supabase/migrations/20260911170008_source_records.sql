-- 0008 Source records (SoT §16.13)
--
-- Raw payload per fetched record. Kept per ADR 0006 §3 so we can
-- re-parse after adapter markup drifts, without re-crawling the
-- source. Small notice pages: yes. Big attached tender-document PDFs:
-- never (SoT §9.2).
--
-- Named procuring-entity officials with phone numbers appear in
-- payload here. ADR 0006 §8 mandates:
--   - Kept in payload (this row).
--   - NOT indexed as structured columns anywhere.
--   - NOT displayed in list views.
--   - Displayed only in detail view to authenticated members.
-- This table has no client access — service_role only.

create table public.source_records (
  id            uuid primary key default gen_random_uuid(),
  source_key    text not null references public.sources(key),
  external_id   text not null,
  source_url    text not null,
  payload       jsonb not null,
  content_hash  text not null,
  fetched_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  parse_version int  not null default 1,

  unique (source_key, external_id)
);

create index source_records_fetched_idx
  on public.source_records (source_key, fetched_at desc);

create index source_records_last_seen_idx
  on public.source_records (source_key, last_seen_at desc);

-- Server-only: no client role has any access. RLS enabled with no
-- policies keeps the table locked against anon and authenticated.
alter table public.source_records enable row level security;

grant select, insert, update, delete on table public.source_records to service_role;
