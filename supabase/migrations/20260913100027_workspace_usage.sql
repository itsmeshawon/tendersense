-- 0027 workspace_usage — monthly counters for quota enforcement
--
-- Phase 4 §2f: 5 assessments/month free, unlimited Pro. Enforced in the
-- create-assessment RPC (Phase 4 PR shipping the runner).

create table public.workspace_usage (
  workspace_id       uuid not null references public.workspaces(id) on delete cascade,
  period_month       date not null,
  assessments_used   integer not null default 0 check (assessments_used >= 0),
  updated_at         timestamptz not null default now(),

  primary key (workspace_id, period_month)
);

alter table public.workspace_usage enable row level security;

-- Members can see their workspace's usage counters (so the UI can show
-- "3 of 5 used this month"). Only service_role writes.
create policy workspace_usage_member_select on public.workspace_usage
  for select using (public.is_workspace_member(workspace_id));

grant select on table public.workspace_usage to authenticated;
grant select, insert, update, delete on table public.workspace_usage to service_role;
