-- Saved interview debriefs produced by the Interview Notetaker.
-- Stores the raw transcript plus the AI-generated structured debrief so a
-- hiring team can revisit and compare candidates.

create table if not exists public.interview_notes (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid,                       -- optional link to applications(id)
  candidate_name  text,
  role_title      text,
  transcript      text,                       -- raw/edited interview transcript
  debrief         text,                       -- AI-generated structured debrief
  recommendation  text,                       -- parsed headline (e.g. "Strong Hire")
  created_by      uuid default auth.uid(),
  organization_id uuid,
  created_at      timestamptz default now()
);

create index if not exists interview_notes_application_id_idx on public.interview_notes (application_id);
create index if not exists interview_notes_created_at_idx      on public.interview_notes (created_at desc);

-- RLS: same model as the rest of the app (authenticated staff have full access;
-- anon has none). See 20260707_enable_rls_security.sql.
alter table public.interview_notes enable row level security;

drop policy if exists interview_notes_authenticated_all on public.interview_notes;
create policy interview_notes_authenticated_all on public.interview_notes
  for all to authenticated using (true) with check (true);
