-- 0012 Monitoring profiles — per-workspace saved filter sets (SoT §16.16)
--
-- A monitoring profile is a named combination of discovery filters a
-- workspace member sets up so the system can (a) render a personalized
-- /opportunities feed and (b) drive notifications for amendments +
-- new-arrivals that match.
--
-- Per Phase 2 plan §2.3 and ADR 0011 (matching algorithm): matching is
-- a deterministic AND across the filter arrays. Fuzzy matching + scoring
-- is Phase 3.
--
-- Free plan cap: one active profile per workspace. Enforced server-side
-- in the RPC that inserts a profile (see Phase 2 sequencing PR #3).

create table public.monitoring_profiles (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references public.workspaces(id) on delete cascade,
  created_by            uuid not null references public.profiles(id),

  name                  text not null,
  is_active             boolean not null default true,

  -- Filter dimensions (all arrays; empty array = "any")
  country_codes         text[] not null default '{}',
  source_keys           text[] not null default '{}',
  sectors               text[] not null default '{}',
  procurement_methods   text[] not null default '{}',
  keywords              text[] not null default '{}',
  excluded_keywords     text[] not null default '{}',

  -- Scalar constraints
  min_value             numeric,
  max_value             numeric,
  currency              text,
  min_days_remaining    integer,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index monitoring_profiles_workspace_idx
  on public.monitoring_profiles (workspace_id);

create index monitoring_profiles_workspace_active_idx
  on public.monitoring_profiles (workspace_id)
  where is_active = true;

-- RLS — same is_workspace_member gate as projects (migration 0005)
alter table public.monitoring_profiles enable row level security;

create policy monitoring_profiles_member_select on public.monitoring_profiles
  for select using (public.is_workspace_member(workspace_id));

create policy monitoring_profiles_member_insert on public.monitoring_profiles
  for insert with check (public.is_workspace_member(workspace_id));

create policy monitoring_profiles_member_update on public.monitoring_profiles
  for update
  using      (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy monitoring_profiles_member_delete on public.monitoring_profiles
  for delete using (public.is_workspace_member(workspace_id));

grant select, insert, update, delete on table public.monitoring_profiles to authenticated;
grant select, insert, update, delete on table public.monitoring_profiles to service_role;
