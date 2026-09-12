-- 0016 create_monitoring_profile RPC — with server-side free-plan gate
--
-- Phase 2 v2 plan §2.3: "Free plan enforcement: reject 2nd active
-- profile in the RPC". This function is the only sanctioned insert
-- path (grants on the table go to authenticated, but the app calls
-- this RPC instead so the free-plan check is impossible to bypass
-- from the client).
--
-- SECURITY DEFINER runs with the function owner's privileges, but
-- the workspace-membership check keeps a caller from touching a
-- workspace they don't belong to.

create or replace function public.create_monitoring_profile(
  p_workspace_id        uuid,
  p_name                text,
  p_country_codes       text[] default '{}',
  p_source_keys         text[] default '{}',
  p_sectors             text[] default '{}',
  p_procurement_methods text[] default '{}',
  p_keywords            text[] default '{}',
  p_excluded_keywords   text[] default '{}',
  p_min_value           numeric default null,
  p_max_value           numeric default null,
  p_currency            text default null,
  p_min_days_remaining  integer default null,
  p_is_active           boolean default true
) returns public.monitoring_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan          text;
  v_active_count  integer;
  v_row           public.monitoring_profiles;
  v_uid           uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'not a workspace member' using errcode = '42501';
  end if;

  select plan into v_plan
  from public.workspaces
  where id = p_workspace_id;

  if v_plan = 'free' and p_is_active then
    select count(*) into v_active_count
    from public.monitoring_profiles
    where workspace_id = p_workspace_id and is_active = true;

    if v_active_count >= 1 then
      raise exception 'MP_FREE_LIMIT: Free plan supports one active monitoring profile'
        using errcode = 'P0001';
    end if;
  end if;

  insert into public.monitoring_profiles (
    workspace_id, created_by, name, is_active,
    country_codes, source_keys, sectors, procurement_methods,
    keywords, excluded_keywords,
    min_value, max_value, currency, min_days_remaining
  ) values (
    p_workspace_id, v_uid, trim(p_name), p_is_active,
    p_country_codes, p_source_keys, p_sectors, p_procurement_methods,
    p_keywords, p_excluded_keywords,
    p_min_value, p_max_value, p_currency, p_min_days_remaining
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.create_monitoring_profile(
  uuid, text, text[], text[], text[], text[], text[], text[],
  numeric, numeric, text, integer, boolean
) to authenticated;
