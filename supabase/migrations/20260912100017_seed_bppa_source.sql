-- 0017 Seed the bd_bppa source (Phase 2 PR #7)
--
-- BPPA (Bangladesh Public Procurement Authority) publishes tender
-- advertisement lists on bppa.gov.bd across four categories: goods,
-- works, services, physical-service. MVP adapter fetches goods (the
-- largest category — ~14k listings vs. ~500 for physical-service).
--
-- Recon: session 21 / 2026-09-12 via WebFetch on the public list page.
-- Rows are a standard <table><tr> with 6 cells + a GET-linkable detail
-- URL (nice contrast to e-GP's POST-form-only detail).

insert into public.sources (key, name, base_url, source_type, ingestion_mode, configuration)
values (
  'bd_bppa',
  'Bangladesh BPPA Advertisement Notices',
  'https://www.bppa.gov.bd/advertisement-notices/advertisement-goods.html',
  'scraper', 'cron',
  '{"category":"goods","pageSize":10}'::jsonb
)
on conflict (key) do nothing;
