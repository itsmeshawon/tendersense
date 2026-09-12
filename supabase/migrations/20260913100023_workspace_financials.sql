-- 0023 workspace_financials — sensitive, admin-restricted
--
-- Profile-plan v0.1 §21 flags this as sensitive; Phase 4 §2i keeps the
-- UI grayed for free tier but reachable to admins. RLS restricts write
-- access to workspace admins (not just members). Read is admin-only too
-- because financial data doesn't belong in every member's view.

create table public.workspace_financials (
  id                        uuid primary key default gen_random_uuid(),
  workspace_id              uuid not null references public.workspaces(id) on delete cascade,
  fiscal_year               integer not null check (fiscal_year >= 2000 and fiscal_year <= 2100),
  currency                  text not null,
  annual_turnover           numeric,
  net_worth                 numeric,
  liquid_assets             numeric,
  largest_contract_value    numeric,
  is_audited                boolean not null default false,
  evidence_document_id      uuid,
  created_by                uuid references public.profiles(id),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  unique (workspace_id, fiscal_year)
);

create index workspace_financials_workspace_year_idx
  on public.workspace_financials (workspace_id, fiscal_year desc);

alter table public.workspace_financials enable row level security;

-- Helper: is the current user a workspace admin?
create or replace function public.is_workspace_admin(ws_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id
      and user_id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

grant execute on function public.is_workspace_admin(uuid) to authenticated;

create policy workspace_financials_admin_select on public.workspace_financials
  for select using (public.is_workspace_admin(workspace_id));

create policy workspace_financials_admin_insert on public.workspace_financials
  for insert with check (public.is_workspace_admin(workspace_id));

create policy workspace_financials_admin_update on public.workspace_financials
  for update
  using      (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

create policy workspace_financials_admin_delete on public.workspace_financials
  for delete using (public.is_workspace_admin(workspace_id));

grant select, insert, update, delete on table public.workspace_financials to authenticated;
grant select, insert, update, delete on table public.workspace_financials to service_role;
