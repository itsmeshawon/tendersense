-- 0024 evidence_documents — uploaded files backing eligibility claims
--
-- Profile-plan v0.1 §24. Files live in a private Supabase Storage bucket
-- accessed via signed URLs only (ADR 0026 in Phase 4).
-- Background text extraction populates `extracted_text` via a job
-- (jobs table 0026, worker in Phase 4).

create table public.evidence_documents (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null references public.workspaces(id) on delete cascade,
  document_type       text not null check (document_type in (
    'cv', 'academic_certificate', 'professional_certificate',
    'reference_letter', 'completion_certificate', 'employment_letter',
    'portfolio', 'company_profile', 'registration_document',
    'trade_license', 'tax_document', 'iso_certificate',
    'contract', 'purchase_order', 'client_reference',
    'audited_financial_statement', 'bank_certificate',
    'project_case_study', 'partnership_certificate', 'other'
  )),
  file_name           text not null,
  storage_path        text not null,
  file_size           integer,
  content_type        text,
  uploaded_by         uuid references public.profiles(id),
  uploaded_at         timestamptz not null default now(),
  extracted_text      text,
  extraction_status   text not null default 'pending' check (extraction_status in ('pending', 'succeeded', 'failed')),
  extraction_error    text,

  unique (workspace_id, storage_path)
);

create index evidence_documents_workspace_idx
  on public.evidence_documents (workspace_id, uploaded_at desc);

create index evidence_documents_pending_idx
  on public.evidence_documents (extraction_status, uploaded_at)
  where extraction_status = 'pending';

alter table public.evidence_documents enable row level security;

create policy evidence_documents_member_select on public.evidence_documents
  for select using (public.is_workspace_member(workspace_id));

create policy evidence_documents_member_insert on public.evidence_documents
  for insert with check (public.is_workspace_member(workspace_id));

create policy evidence_documents_member_update on public.evidence_documents
  for update
  using      (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy evidence_documents_member_delete on public.evidence_documents
  for delete using (public.is_workspace_member(workspace_id));

grant select, insert, update, delete on table public.evidence_documents to authenticated;
grant select, insert, update, delete on table public.evidence_documents to service_role;
