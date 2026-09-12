-- 0022 workspace_credentials — restores the deferred credential signal
--
-- ADR 0016 recovery path enacted (§2h weight rebalance in Phase 4).
-- Profile-plan v0.1 §19.

create table public.workspace_credentials (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references public.workspaces(id) on delete cascade,
  credential_type       text not null check (credential_type in (
    'iso', 'cmmi', 'business_license', 'tax_registration',
    'professional_accreditation', 'technology_partnership',
    'membership', 'security', 'award', 'other'
  )),
  name                  text not null,
  issuer                text,
  credential_number     text,
  issue_date            date,
  expiry_date           date,
  status                text not null default 'valid' check (status in ('valid', 'expired', 'revoked')),
  country_code          text,
  -- FK to evidence_documents.id; loose because 0024 lands later
  evidence_document_id  uuid,
  created_by            uuid references public.profiles(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  -- Prevent obvious duplicates within a workspace.
  unique (workspace_id, credential_type, name, credential_number)
);

create index workspace_credentials_workspace_idx
  on public.workspace_credentials (workspace_id);

create index workspace_credentials_expiry_idx
  on public.workspace_credentials (workspace_id, expiry_date)
  where expiry_date is not null;

alter table public.workspace_credentials enable row level security;

create policy workspace_credentials_member_select on public.workspace_credentials
  for select using (public.is_workspace_member(workspace_id));

create policy workspace_credentials_member_insert on public.workspace_credentials
  for insert with check (public.is_workspace_member(workspace_id));

create policy workspace_credentials_member_update on public.workspace_credentials
  for update
  using      (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy workspace_credentials_member_delete on public.workspace_credentials
  for delete using (public.is_workspace_member(workspace_id));

grant select, insert, update, delete on table public.workspace_credentials to authenticated;
grant select, insert, update, delete on table public.workspace_credentials to service_role;
