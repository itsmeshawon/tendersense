-- 0019 Workspace capabilities — what the workspace can do
--
-- SoT §16.8 + Phase 3 plan v2 §3.1.
--
-- Capabilities are the primary matching signal (35 of 100 points per
-- §2). Two entry paths:
--   - user: the user picked it from the SoT §16.7 taxonomy
--   - auto_derived: cold-start heuristic (§2b) — after eExperience
--     import, bucket the project's title/description against the
--     taxonomy and mark suggested ones. The user can confirm (promote
--     to source='user') or remove.
--
-- Fixed taxonomy for MVP — no custom entries until Pro tier (Phase 3
-- Q1 decision). We store the label as free text but the app-side
-- code will validate against the seed list.

create table public.workspace_capabilities (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  label             text not null,
  source            text not null default 'user'
                    check (source in ('user', 'auto_derived')),
  confidence        real,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  unique (workspace_id, label)
);

create index workspace_capabilities_workspace_idx
  on public.workspace_capabilities (workspace_id);

alter table public.workspace_capabilities enable row level security;

create policy workspace_capabilities_member_select on public.workspace_capabilities
  for select using (public.is_workspace_member(workspace_id));

create policy workspace_capabilities_member_insert on public.workspace_capabilities
  for insert with check (public.is_workspace_member(workspace_id));

create policy workspace_capabilities_member_update on public.workspace_capabilities
  for update
  using      (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy workspace_capabilities_member_delete on public.workspace_capabilities
  for delete using (public.is_workspace_member(workspace_id));

grant select, insert, update, delete on table public.workspace_capabilities to authenticated;
grant select, insert, update, delete on table public.workspace_capabilities to service_role;
