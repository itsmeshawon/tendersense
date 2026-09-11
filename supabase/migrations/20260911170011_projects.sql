-- 0011 Projects — a workspace's past contracts / experience (SoT §16.9)
--
-- The projects table stores the workspace's history — contracts they
-- have won, work they have done. Populated in two ways:
--
--   1. On-demand eExperience lookup: user types their company name,
--      we fetch from e-GP's public eExperience surface, they tick
--      the ones that are theirs. Ticked rows land here with
--      evidence_credential_number set to the e-GP certificate no.
--      (Phase 1 step 8, per plan §5.)
--
--   2. Manual entry (future) if a workspace member wants to add work
--      that isn't in the public register.
--
-- Feeds Phase 3 matching (past project similarity) and Phase 4
-- assessment (experience checks).

create table public.projects (
  id                            uuid primary key default gen_random_uuid(),
  workspace_id                  uuid not null references public.workspaces(id) on delete cascade,

  name                          text not null,
  client_name                   text,
  country_code                  text,
  sector                        text,

  start_date                    date,
  end_date                      date,
  contract_value                numeric,
  currency                      text,

  summary                       text,
  services                      text[],
  technologies                  text[],

  -- Certificate / reference number issued by the procuring entity
  -- (e-GP eExperience returns this per row). Distinct from the
  -- workspace's own project id.
  evidence_credential_number    text,

  -- Whether this row is safe to show in aggregated / anonymized views.
  is_public                     boolean not null default false,

  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create index projects_workspace_idx on public.projects (workspace_id);
create index projects_end_date_idx  on public.projects (end_date desc);

-- RLS: workspace members read + write their own workspace's projects
-- (same pattern as workspaces — is_workspace_member helper defined
-- in migration 0005).
alter table public.projects enable row level security;

create policy projects_member_select on public.projects
  for select using (public.is_workspace_member(workspace_id));

create policy projects_member_insert on public.projects
  for insert with check (public.is_workspace_member(workspace_id));

create policy projects_member_update on public.projects
  for update
  using      (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy projects_member_delete on public.projects
  for delete using (public.is_workspace_member(workspace_id));

grant select, insert, update, delete on table public.projects to authenticated;
grant select, insert, update, delete on table public.projects to service_role;
