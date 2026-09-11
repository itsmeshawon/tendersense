-- 0004 Signup allowlist + auth-user trigger
--
-- Pilot signup is invite-only. The trigger fires after auth.users insert:
--   1. If email is not on the allowlist, raise → transaction rolls back →
--      auth.users row is not persisted → no confirmation email is sent.
--   2. Otherwise, create the profile row.

create table public.allowed_signup_emails (
  email citext primary key,
  invited_by uuid references auth.users(id),
  invited_at timestamptz not null default now(),
  note text
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.allowed_signup_emails
    where email = new.email
  ) then
    raise exception 'email % is not on the signup allowlist', new.email
      using errcode = 'insufficient_privilege';
  end if;

  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
