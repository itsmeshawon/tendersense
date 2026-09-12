-- 0021 opportunity_requirements + requirement_evaluations
--
-- SoT §21 (requirement categories) + §22 (5-status evaluation).
-- Phase 4 plan v2 §3.

create table public.opportunity_requirements (
  id                uuid primary key default gen_random_uuid(),
  assessment_id     uuid not null references public.assessments(id) on delete cascade,
  category          text not null check (category in (
    'legal', 'financial', 'technical', 'experience', 'personnel',
    'certification', 'geography', 'documentation', 'submission',
    'security', 'other'
  )),
  text              text not null,
  normalized_key    text,
  mandatory         boolean not null default true,
  threshold         jsonb,
  source_location   text,
  confidence        real check (confidence is null or (confidence >= 0 and confidence <= 1)),
  -- Provenance: rules extractor vs manually added by admin (Phase 4 §2d)
  source            text not null default 'rules' check (source in ('rules', 'manual')),
  created_at        timestamptz not null default now()
);

create index opportunity_requirements_assessment_idx
  on public.opportunity_requirements (assessment_id, category);

create table public.requirement_evaluations (
  id                uuid primary key default gen_random_uuid(),
  requirement_id    uuid not null references public.opportunity_requirements(id) on delete cascade,
  -- SoT §22 5-status set. "Unknown must never automatically become gap"
  -- — enforced in the evaluator code, not in this constraint.
  status            text not null check (status in (
    'meets', 'partially_meets', 'needs_verification', 'gap', 'not_applicable'
  )),
  evidence_refs     jsonb not null default '[]'::jsonb,
  reasoning         text,
  evaluated_at      timestamptz not null default now(),

  unique (requirement_id)
);

alter table public.opportunity_requirements enable row level security;
alter table public.requirement_evaluations enable row level security;

-- Read via the parent assessment's workspace membership.
create policy opportunity_requirements_member_select on public.opportunity_requirements
  for select using (
    exists (
      select 1 from public.assessments a
      where a.id = opportunity_requirements.assessment_id
        and public.is_workspace_member(a.workspace_id)
    )
  );

create policy requirement_evaluations_member_select on public.requirement_evaluations
  for select using (
    exists (
      select 1 from public.opportunity_requirements r
      join public.assessments a on a.id = r.assessment_id
      where r.id = requirement_evaluations.requirement_id
        and public.is_workspace_member(a.workspace_id)
    )
  );

grant select on table public.opportunity_requirements to authenticated;
grant select on table public.requirement_evaluations to authenticated;
grant select, insert, update, delete on table public.opportunity_requirements to service_role;
grant select, insert, update, delete on table public.requirement_evaluations to service_role;
