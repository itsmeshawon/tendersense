-- 0001 Extensions
--
-- citext:   case-insensitive text for email columns
-- pgcrypto: gen_random_uuid()
-- pg_trgm:  trigram indexes for search (used by Phase 2)

create extension if not exists citext;
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
