-- 0015 opportunities.source_metadata — adapter-specific extras (jsonb)
--
-- Some sources carry per-tender fields that don't fit the normalized
-- opportunities schema but are needed for downstream UX. Currently:
--
-- - bd_egp:  { "egpId": "1332199" } — the internal tender id needed to
--            construct a client-side POST form that opens the tender
--            detail page on eprocure.gov.bd (search page is POST-only,
--            per docs/egp-notices-reconnaissance-checklist.md).
--
-- Kept as jsonb so future adapters can stash their own extras without
-- schema churn. No index for MVP — read-side access is per-row.

alter table public.opportunities
  add column if not exists source_metadata jsonb not null default '{}'::jsonb;

-- Backfill: existing bd_egp rows encode the tender id in external_id
-- as "BD_EGP:<tenderId>". Copy it into source_metadata.egpId so the UI
-- can construct the client-side POST form immediately, without waiting
-- for a re-sync (content_hash is unchanged, so the runner would
-- otherwise treat these rows as "unchanged" and not update them).
update public.opportunities
set source_metadata = jsonb_build_object(
  'egpId', substring(external_id from 'BD_EGP:(.+)$')
)
where source_key = 'bd_egp'
  and (source_metadata is null or source_metadata = '{}'::jsonb)
  and external_id like 'BD_EGP:%';
