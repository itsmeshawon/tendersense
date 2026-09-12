-- 0020 assessments — the top-level record of one detailed-assessment run
--
-- SoT §20 + Phase 4 plan v2 §3.
-- One row per assessment run. Never overwritten; re-runs create new rows
-- (SoT §20 mandate + Phase 4 §2j "keep forever"). scoring_version pins
-- which weights were in effect at run time.

create table public.assessments (
  id                      uuid primary key default gen_random_uuid(),
  workspace_id            uuid not null references public.workspaces(id) on delete cascade,
  opportunity_id          uuid not null references public.opportunities(id) on delete cascade,
  status                  text not null check (status in ('queued', 'running', 'succeeded', 'failed')),
  eligibility             text check (eligibility in ('pass', 'partial', 'needs_verification', 'fail', 'not_evaluated')),
  eligibility_score       smallint check (eligibility_score is null or (eligibility_score >= 0 and eligibility_score <= 100)),
  recommendation          text check (recommendation in ('bid', 'verify', 'hold', 'skip')),
  recommendation_reason   text check (recommendation_reason in ('strong_pursue', 'potential_pursue', 'needs_review', 'high_risk', 'likely_decline')),
  summary                 text,
  category_scores         jsonb not null default '{}'::jsonb,
  -- Phase 4 §2d: rules-based extraction in MVP; LLM deferred.
  extraction_method       text not null default 'rules' check (extraction_method in ('rules', 'manual', 'mixed')),
  extraction_meta         jsonb not null default '{}'::jsonb,
  requested_by            uuid references public.profiles(id),
  requested_at            timestamptz not null default now(),
  completed_at            timestamptz,
  error                   text,
  scoring_version         integer not null default 1,
  idempotency_key         text,

  unique (workspace_id, opportunity_id, idempotency_key)
);

create index assessments_workspace_opportunity_idx
  on public.assessments (workspace_id, opportunity_id, requested_at desc);

create index assessments_status_idx
  on public.assessments (status)
  where status in ('queued', 'running');

alter table public.assessments enable row level security;

create policy assessments_member_select on public.assessments
  for select using (public.is_workspace_member(workspace_id));

-- No client-side insert path: assessments are created via a SECURITY
-- DEFINER RPC that also enforces quota. Grant only select to
-- authenticated; service_role has full access.
grant select on table public.assessments to authenticated;
grant select, insert, update, delete on table public.assessments to service_role;
