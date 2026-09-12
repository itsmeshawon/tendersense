-- 0025 workspace_workforce + workspace_experts
--
-- Profile-plan v0.1 §22.

create table public.workspace_workforce (
  workspace_id      uuid primary key references public.workspaces(id) on delete cascade,
  total_employees   integer,
  -- Free-form counts: { "engineers": 40, "project_managers": 8, ... }.
  -- Keys defined by app-side taxonomy so the schema can evolve without
  -- migration churn.
  role_counts       jsonb not null default '{}'::jsonb,
  updated_by        uuid references public.profiles(id),
  updated_at        timestamptz not null default now()
);

alter table public.workspace_workforce enable row level security;

create policy workspace_workforce_member_select on public.workspace_workforce
  for select using (public.is_workspace_member(workspace_id));

create policy workspace_workforce_member_upsert on public.workspace_workforce
  for insert with check (public.is_workspace_member(workspace_id));

create policy workspace_workforce_member_update on public.workspace_workforce
  for update
  using      (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

grant select, insert, update, delete on table public.workspace_workforce to authenticated;
grant select, insert, update, delete on table public.workspace_workforce to service_role;

-- Key experts — small directory of named personnel the workspace can
-- offer for consultancy tenders. CV via evidence_documents.

create table public.workspace_experts (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  name              text not null,
  role              text,
  years_experience  integer check (years_experience is null or years_experience >= 0),
  sectors           text[] not null default '{}',
  availability      text check (availability is null or availability in ('full_time', 'part_time', 'short_term', 'on_demand')),
  cv_document_id    uuid,
  created_by        uuid references public.profiles(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index workspace_experts_workspace_idx
  on public.workspace_experts (workspace_id, name);

alter table public.workspace_experts enable row level security;

create policy workspace_experts_member_select on public.workspace_experts
  for select using (public.is_workspace_member(workspace_id));

create policy workspace_experts_member_insert on public.workspace_experts
  for insert with check (public.is_workspace_member(workspace_id));

create policy workspace_experts_member_update on public.workspace_experts
  for update
  using      (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy workspace_experts_member_delete on public.workspace_experts
  for delete using (public.is_workspace_member(workspace_id));

grant select, insert, update, delete on table public.workspace_experts to authenticated;
grant select, insert, update, delete on table public.workspace_experts to service_role;
