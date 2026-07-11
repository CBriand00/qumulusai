-- AI audit log: one append-only row per AI inference call routed through the
-- ai-query edge function. This is the backbone of AI governance — it makes every
-- AI call traceable: who triggered it, which model/version/prompt, token cost,
-- latency, and a hash of the input (raw inputs are NOT stored, to avoid
-- persisting candidate PII).
--
-- Writes happen only from the edge function using the service_role key (which
-- bypasses RLS). Authenticated staff can READ the log (for the AI Governance
-- dashboard) but have no insert/update/delete policy, so the log is effectively
-- append-only and tamper-resistant from the application.

create table if not exists public.ai_audit_log (
  id              uuid primary key default gen_random_uuid(),
  actor_id        uuid,          -- auth.users id of the caller (from the JWT)
  feature         text,          -- e.g. 'candidate_eval', 'interview_debrief', 'sourcing_chat'
  model           text,          -- configured model
  model_version   text,          -- resolved model returned by the provider
  prompt_version  text,          -- version tag of the system prompt
  temperature     numeric,
  max_tokens      integer,
  input_hash      text,          -- sha256 of the input (system+messages); raw input not stored
  input_chars     integer,
  output_preview  text,          -- truncated output for review
  output_chars    integer,
  input_tokens    integer,
  output_tokens   integer,
  latency_ms      integer,
  status          text,          -- 'ok' | 'error'
  error           text,
  entity_type     text,          -- optional link, e.g. 'application'
  entity_id       uuid,
  organization_id uuid,
  created_at      timestamptz default now()
);

create index if not exists ai_audit_log_created_at_idx on public.ai_audit_log (created_at desc);
create index if not exists ai_audit_log_feature_idx    on public.ai_audit_log (feature);
create index if not exists ai_audit_log_actor_idx      on public.ai_audit_log (actor_id);

alter table public.ai_audit_log enable row level security;

-- Read-only for authenticated staff; no write policies (service_role bypasses RLS).
drop policy if exists ai_audit_log_select_authenticated on public.ai_audit_log;
create policy ai_audit_log_select_authenticated on public.ai_audit_log
  for select to authenticated using (true);
