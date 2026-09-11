-- 0006 Explicit table grants for authenticated + service_role
--
-- Rationale:
--   Supabase's hosted platform sets default privileges via a config
--   trigger so anon/authenticated/service_role get sensible grants on
--   any table created in the public schema. The local dev stack does
--   NOT set those defaults — a fresh `supabase db reset` leaves
--   authenticated/anon with only TRIGGER/REFERENCES/TRUNCATE, so RLS
--   policies can't even be reached (permission denied at the grant
--   layer, before RLS runs). This migration makes grants explicit so
--   local and hosted behave identically. GRANT is idempotent on both.
--
--   RLS remains enforced for anon and authenticated (policies in 0005
--   still filter which rows they see).

-- ---------------------------------------------------------------
-- authenticated: read-only via RLS. Writes go through create_workspace
-- RPC (SECURITY DEFINER) in Phase 0. Direct writes are blocked by RLS.
-- ---------------------------------------------------------------
grant select on table public.profiles          to authenticated;
grant update on table public.profiles          to authenticated;
grant select on table public.workspaces        to authenticated;
grant select on table public.workspace_members to authenticated;

-- ---------------------------------------------------------------
-- anon: nothing beyond default. RLS + missing grants keep it locked.
-- ---------------------------------------------------------------

-- ---------------------------------------------------------------
-- service_role: full CRUD. Bypasses RLS via role attribute + grants.
-- Used by admin scripts, integration tests, and future server-only
-- code that must skip RLS.
-- ---------------------------------------------------------------
grant select, insert, update, delete
  on table public.profiles              to service_role;
grant select, insert, update, delete
  on table public.workspaces            to service_role;
grant select, insert, update, delete
  on table public.workspace_members     to service_role;
grant select, insert, update, delete
  on table public.allowed_signup_emails to service_role;
