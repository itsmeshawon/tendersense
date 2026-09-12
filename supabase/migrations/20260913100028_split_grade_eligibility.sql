-- 0028 opportunity_matches: split grade / eligibility
--
-- Phase 4 §2b (ADR 0020). Adds an eligibility column so the two axes
-- (fit + qualification) can be reported independently. Migrates existing
-- `not_eligible` grades to eligibility='fail' + grade='D'. The
-- `not_eligible` value stays in the grade check-constraint for now to
-- avoid breakage during the transition; a later migration removes it
-- once all app-side code has moved to the new column.

alter table public.opportunity_matches
  add column eligibility text
    check (eligibility in ('pass', 'partial', 'needs_verification', 'fail', 'not_evaluated'))
    default 'not_evaluated',
  add column eligibility_computed_at timestamptz;

-- Migrate the pre-Phase-4 short-circuit values.
update public.opportunity_matches
   set eligibility = 'fail',
       grade       = 'D',
       eligibility_computed_at = now()
 where grade = 'not_eligible';

create index opportunity_matches_workspace_eligibility_idx
  on public.opportunity_matches (workspace_id, eligibility);
