-- 0005 RLS policies + create_workspace RPC (SoT §17)
--
-- Rule: a user may access a workspace-owned row only when an active
-- workspace_members row exists. Membership check lives in a
-- security-definer helper so RLS policies do not recurse on
-- workspace_members itself.

alter table public.profiles              enable row level security;
alter table public.workspaces            enable row level security;
alter table public.workspace_members     enable row level security;
alter table public.allowed_signup_emails enable row level security;

-- ---------------------------------------------------------------
-- Membership helper
-- ---------------------------------------------------------------
create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = p_workspace_id
      and user_id      = auth.uid()
      and status       = 'active'
  );
$$;

revoke all on function public.is_workspace_member(uuid) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;

-- ---------------------------------------------------------------
-- profiles: user may see/update their own row
-- ---------------------------------------------------------------
create policy profiles_self_select on public.profiles
  for select using (id = auth.uid());

create policy profiles_self_update on public.profiles
  for update using (id = auth.uid())
              with check (id = auth.uid());

-- ---------------------------------------------------------------
-- workspaces: readable to any active member
-- (writes forced through create_workspace RPC in Phase 0)
-- ---------------------------------------------------------------
create policy workspaces_member_select on public.workspaces
  for select using (public.is_workspace_member(id));

-- ---------------------------------------------------------------
-- workspace_members:
--   read: your own rows, or rows in workspaces you are an active member of
-- (writes forced through create_workspace RPC in Phase 0)
-- ---------------------------------------------------------------
create policy workspace_members_self_select on public.workspace_members
  for select using (
    user_id = auth.uid()
    or public.is_workspace_member(workspace_id)
  );

-- ---------------------------------------------------------------
-- allowed_signup_emails:
-- no client access. service_role bypasses RLS. Rows added via SQL by admin.
-- ---------------------------------------------------------------

-- ---------------------------------------------------------------
-- create_workspace RPC
-- ---------------------------------------------------------------
create or replace function public.create_workspace(
  p_name text,
  p_workspace_type text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id      uuid := auth.uid();
  v_workspace_id uuid;
  v_slug         text;
begin
  if v_user_id is null then
    raise exception 'not authenticated'
      using errcode = 'insufficient_privilege';
  end if;

  if p_workspace_type not in ('individual','organization') then
    raise exception 'invalid workspace_type: %', p_workspace_type;
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'workspace name is required';
  end if;

  v_slug := regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g')
          || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 6);

  insert into public.workspaces (name, slug, workspace_type, owner_user_id)
  values (trim(p_name), v_slug, p_workspace_type, v_user_id)
  returning id into v_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role, status, joined_at)
  values (v_workspace_id, v_user_id, 'admin', 'active', now());

  return v_workspace_id;
end;
$$;

revoke all on function public.create_workspace(text, text) from public;
grant execute on function public.create_workspace(text, text) to authenticated;
