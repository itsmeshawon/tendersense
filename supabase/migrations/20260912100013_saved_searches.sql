-- 0013 Saved searches — named URL-param snapshots (SoT §16.17)
--
-- Simpler than monitoring_profiles: capture whatever filter combination
-- the user has active on /opportunities and save it under a name. The
-- UI renders each saved search as a clickable link that restores the
-- URL params.
--
-- Not a match-driver — this is a bookmark facility. Monitoring
-- profiles do the personalized-feed + notifications job.

create table public.saved_searches (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  created_by    uuid not null references public.profiles(id),

  name          text not null,
  -- Serialized URL param set — jsonb keeps the schema flexible as
  -- /opportunities picks up new filters over time (Phase 2 FTS, sort,
  -- etc.). Example: { "country": "BD", "source": "world_bank", "q": "erp" }
  query_params  jsonb not null default '{}'::jsonb,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index saved_searches_workspace_idx on public.saved_searches (workspace_id);

alter table public.saved_searches enable row level security;

create policy saved_searches_member_select on public.saved_searches
  for select using (public.is_workspace_member(workspace_id));

create policy saved_searches_member_insert on public.saved_searches
  for insert with check (public.is_workspace_member(workspace_id));

create policy saved_searches_member_update on public.saved_searches
  for update
  using      (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy saved_searches_member_delete on public.saved_searches
  for delete using (public.is_workspace_member(workspace_id));

grant select, insert, update, delete on table public.saved_searches to authenticated;
grant select, insert, update, delete on table public.saved_searches to service_role;
