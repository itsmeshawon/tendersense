-- 0014 Notifications — in-app amendment + monitoring alerts (SoT §16.27)
--
-- The runner (Phase 1) writes opportunity_revisions on content_hash
-- changes. Phase 2 adds notification fan-out: for each revision, insert
-- a notifications row for every workspace where the opportunity is
-- shortlisted (Phase 3) OR matches an active monitoring profile.
--
-- Delivery is in-app only for MVP (bell + /notifications route). Email
-- digest is Phase 6.
--
-- Retention (per Phase 2 v2 §6 Q5 decision, 2026-09-12): bell query
-- filters to last 30 days; full /notifications list retains everything
-- for audit.

create type public.notification_kind as enum (
  'amendment',
  'new_match',
  'deadline_soon'
);

create table public.notifications (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  user_id         uuid references public.profiles(id) on delete cascade,

  kind            public.notification_kind not null,
  opportunity_id  uuid references public.opportunities(id) on delete cascade,
  revision_id     uuid references public.opportunity_revisions(id) on delete set null,

  title           text not null,
  body            text,
  -- Free-form context (e.g., { "changed_fields": ["deadline_at"], "profile_id": "..." })
  metadata        jsonb not null default '{}'::jsonb,

  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index notifications_workspace_created_idx
  on public.notifications (workspace_id, created_at desc);

create index notifications_workspace_unread_idx
  on public.notifications (workspace_id, created_at desc)
  where read_at is null;

create index notifications_opportunity_idx
  on public.notifications (opportunity_id);

-- RLS — workspace members can read their workspace's notifications.
-- Writes come from the service_role runner (revision fan-out) or from
-- the user marking read; a user-scoped read policy handles the latter.
alter table public.notifications enable row level security;

create policy notifications_member_select on public.notifications
  for select using (public.is_workspace_member(workspace_id));

-- Only allow updating read_at (marking as read); no other columns
-- should change from the client. Enforced by the update RPC (Phase 2
-- PR #6). Policy here just gates who can attempt an update.
create policy notifications_member_update on public.notifications
  for update
  using      (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- No insert / delete policy for authenticated — the runner (service_role)
-- inserts; retention/cleanup is server-side.
grant select, update on table public.notifications to authenticated;
grant select, insert, update, delete on table public.notifications to service_role;
