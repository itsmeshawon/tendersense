-- 0009 Opportunities — normalized procurement notices (SoT §16.14)
--
-- The user-facing table. One row per canonical procurement opportunity.
-- Normalized from source_records at ingestion time. Authenticated
-- users can read the entire table; RLS policy is intentionally
-- permissive because opportunities are public procurement info
-- (SoT §17 exception).
--
-- Deliberately absent (per ADR 0006 §8): official_name, official_phone,
-- official_email, or any structured PII field. The raw payload in
-- source_records holds those; nothing about a named human is indexed
-- here.

create table public.opportunities (
  id                       uuid primary key default gen_random_uuid(),
  source_key               text not null references public.sources(key),
  external_id              text not null,
  source_url               text not null,

  title                    text not null,
  description              text,
  search_text              tsvector,

  notice_type              text,
  procurement_category     text,
  procurement_method       text,

  country_code             text,
  country_name             text,
  region                   text,
  district                 text,

  issuer_name              text,
  ministry_name            text,
  agency_name              text,
  procuring_entity_name    text,

  project_id               text,
  reference_no             text,

  sector                   text[],
  tags                     text[],

  publication_at           timestamptz,
  deadline_at              timestamptz,

  currency                 text,
  estimated_value_min      numeric,
  estimated_value_max      numeric,

  status                   text not null default 'open'
                           check (status in ('open','closed','cancelled','awarded','unknown')),
  language                 text,

  content_hash             text not null,
  source_updated_at        timestamptz,
  first_seen_at            timestamptz not null default now(),
  last_seen_at             timestamptz not null default now(),

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  unique (source_key, external_id)
);

create trigger opportunities_set_updated_at
  before update on public.opportunities
  for each row execute function public.set_updated_at();

-- Indexes per SoT §16.14 recommendations
create index opportunities_deadline_idx        on public.opportunities (deadline_at);
create index opportunities_publication_idx     on public.opportunities (publication_at desc);
create index opportunities_country_idx         on public.opportunities (country_code);
create index opportunities_source_idx          on public.opportunities (source_key);
create index opportunities_status_idx          on public.opportunities (status);
create index opportunities_search_idx          on public.opportunities using gin (search_text);
create index opportunities_sector_idx          on public.opportunities using gin (sector);
create index opportunities_tags_idx            on public.opportunities using gin (tags);

-- Keep search_text in sync with title + description on insert/update.
-- Weights follow SoT §18 (title=A, description=B).
create or replace function public.opportunities_search_text_refresh()
returns trigger
language plpgsql
as $$
begin
  new.search_text :=
    setweight(to_tsvector('simple', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.reference_no, '')), 'C');
  return new;
end;
$$;

create trigger opportunities_search_text_refresh
  before insert or update of title, description, reference_no
  on public.opportunities
  for each row execute function public.opportunities_search_text_refresh();

-- RLS: any authenticated user may read every opportunity (public
-- procurement info). No client write access — writes happen via
-- service_role from ingestion jobs.
alter table public.opportunities enable row level security;

create policy opportunities_authenticated_select on public.opportunities
  for select
  using (auth.uid() is not null);

grant select on table public.opportunities to authenticated;
grant select, insert, update, delete on table public.opportunities to service_role;
