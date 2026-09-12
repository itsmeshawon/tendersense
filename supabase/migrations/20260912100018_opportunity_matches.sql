-- 0018 Opportunity matches — precomputed grade + reasons per workspace
--
-- SoT §16.18 + Phase 3 plan v2 §3.1.
--
-- One row per (workspace × opportunity) pair. Rewritten on:
--   - New opportunity landed (runner fanout — Phase 3 PR #3)
--   - Workspace profile changed (server action)
-- Rescoped on schema/weight change via `scoring_version`.
--
-- Grade vocabulary locked by ADR 0006 §5: A/B/C/D + not_eligible +
-- need_more_info. Score is 0-100 (per §2 of Phase 3 plan).

create table public.opportunity_matches (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  opportunity_id    uuid not null references public.opportunities(id) on delete cascade,

  score             smallint not null default 0,
  grade             text not null check (grade in ('A', 'B', 'C', 'D', 'not_eligible', 'need_more_info')),

  -- Top positive reasons (why the grade is what it is). Each entry:
  -- { dimension: string, contribution: number, evidence: string }
  reasons           jsonb not null default '[]'::jsonb,

  -- Top concerns (why the grade isn't higher). Same shape as reasons.
  concerns          jsonb not null default '[]'::jsonb,

  -- Every match row records the weight-set version it was computed
  -- against. Enables observe-then-tune calibration (Phase 3 v2 §3.5).
  scoring_version   integer not null default 1,

  computed_at       timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  unique (workspace_id, opportunity_id)
);

create index opportunity_matches_workspace_grade_idx
  on public.opportunity_matches (workspace_id, grade);

create index opportunity_matches_workspace_score_idx
  on public.opportunity_matches (workspace_id, score desc);

alter table public.opportunity_matches enable row level security;

-- Workspace members can read their own matches. No client write path
-- — recompute runs server-side (service_role) via a repository call.
create policy opportunity_matches_member_select on public.opportunity_matches
  for select using (public.is_workspace_member(workspace_id));

grant select on table public.opportunity_matches to authenticated;
grant select, insert, update, delete on table public.opportunity_matches to service_role;
