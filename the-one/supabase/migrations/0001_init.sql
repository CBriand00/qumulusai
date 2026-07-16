-- ============================================================================
--  The One — Core schema (Phase 1)
--  Extensions, enums, identity/roles, applications, assessments, media,
--  review/admin, messaging, dates, notifications, consent, CMS, audit, privacy.
--  Row Level Security is defined in 0002_rls.sql. Storage in 0003_storage.sql.
-- ============================================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "citext";         -- case-insensitive text

-- ---------------------------------------------------------------------------
--  Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('public', 'applicant', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type applicant_status as enum (
    'draft','submitted','under_review','additional_info_requested',
    'shortlisted','approved_to_connect','messaging_open','date_invited',
    'dating','paused','not_selected','withdrawn','blocked','archived'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type flag_type as enum ('green','concern','red','contradiction');
exception when duplicate_object then null; end $$;

do $$ begin
  create type verification_status as enum ('unverified','pending','verified','failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type media_kind as enum ('primary_photo','photo','professional_photo','full_length_photo','video_intro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type date_status as enum ('proposed','accepted','declined','counter_proposed','cancelled','completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type date_mode as enum ('virtual','in_person');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_kind as enum (
    'application_submitted','status_updated','info_requested','messaging_unlocked',
    'new_message','date_invitation','date_updated','date_cancelled',
    'security_notice','deletion_confirmed'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
--  updated_at helper
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
--  Identity & roles
--  profiles is 1:1 with auth.users. role is authoritative for authorization.
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         user_role   not null default 'applicant',
  full_name    text,
  terms_accepted_at timestamptz,
  is_suspended boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- Admin check used throughout RLS. SECURITY DEFINER so policies can read the
-- role without recursing through profiles' own RLS.
create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- Auto-create a profile on signup. Role is ALWAYS 'applicant' here — it can
-- never be set to admin from the client. Admins are promoted manually in SQL.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name, terms_accepted_at)
  values (
    new.id,
    'applicant',
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    (new.raw_user_meta_data ->> 'terms_accepted_at')::timestamptz
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Prevent applicants from escalating their own role. Only admins (or the
-- service role, which bypasses RLS) may change role / suspension.
create or replace function guard_profile_privileged_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role
      or new.is_suspended is distinct from old.is_suspended)
     and not is_admin() then
    raise exception 'Not authorized to modify privileged profile fields';
  end if;
  return new;
end $$;

create trigger trg_profiles_guard before update on profiles
  for each row execute function guard_profile_privileged_fields();

-- ---------------------------------------------------------------------------
--  Applications & structured applicant profile
-- ---------------------------------------------------------------------------
create table if not exists applications (
  id               uuid primary key default gen_random_uuid(),
  applicant_id     uuid not null references auth.users(id) on delete cascade,
  status           applicant_status not null default 'draft',
  current_step     int not null default 1,
  application_code text unique,
  submitted_at     timestamptz,
  locked_at        timestamptz,
  deleted_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (applicant_id)
);
create index if not exists idx_applications_status on applications(status);
create index if not exists idx_applications_applicant on applications(applicant_id);
create trigger trg_applications_updated before update on applications
  for each row execute function set_updated_at();

create table if not exists applicant_profiles (
  applicant_id   uuid primary key references auth.users(id) on delete cascade,
  legal_first_name text,
  preferred_name text,
  last_name      text,
  date_of_birth  date,
  city           text,
  state          text,
  country        text,
  phone          text,
  height_cm      int,
  pronouns       text,
  occupation     text,
  employer       text,
  industry       text,
  education_level text,
  linkedin_url   text,
  instagram_url  text,
  website_url    text,
  income_range   text,
  has_children   boolean,
  wants_children text,
  relationship_status text,
  short_bio      text,
  age_confirmed_over_min boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint chk_age check (
    date_of_birth is null
    or date_of_birth <= (current_date - interval '18 years')
  )
);
create trigger trg_applicant_profiles_updated before update on applicant_profiles
  for each row execute function set_updated_at();

-- Application is organized into sections; free-form answers are stored as an
-- EAV table keyed by question so the questionnaire can evolve without schema
-- churn. Structured, queried fields live in applicant_profiles above.
create table if not exists application_sections (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,      -- e.g. 'faith_values'
  title       text not null,
  step_order  int not null,
  created_at  timestamptz not null default now()
);

create table if not exists assessment_questions (
  id           uuid primary key default gen_random_uuid(),
  section_id   uuid references application_sections(id) on delete set null,
  key          text not null unique,
  prompt       text not null,
  input_type   text not null default 'text',  -- text | textarea | scale | select | boolean
  is_required  boolean not null default false,
  sort_order   int not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger trg_questions_updated before update on assessment_questions
  for each row execute function set_updated_at();

create table if not exists assessment_options (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references assessment_questions(id) on delete cascade,
  label       text not null,
  value       text not null,
  sort_order  int not null default 0
);

create table if not exists application_answers (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  question_key   text not null,
  value_text     text,
  value_number   numeric,
  value_bool     boolean,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (application_id, question_key)
);
create index if not exists idx_answers_application on application_answers(application_id);
create trigger trg_answers_updated before update on application_answers
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
--  Status history (append-only)
-- ---------------------------------------------------------------------------
create table if not exists status_history (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  from_status    applicant_status,
  to_status      applicant_status not null,
  changed_by     uuid references auth.users(id),
  reason         text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_status_history_app on status_history(application_id);

-- ---------------------------------------------------------------------------
--  Media & verification
-- ---------------------------------------------------------------------------
create table if not exists applicant_media (
  id             uuid primary key default gen_random_uuid(),
  applicant_id   uuid not null references auth.users(id) on delete cascade,
  kind           media_kind not null,
  storage_path   text not null,       -- path within the private bucket
  mime_type      text,
  size_bytes     bigint,
  duration_seconds int,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists idx_media_applicant on applicant_media(applicant_id);

create table if not exists verification_records (
  id             uuid primary key default gen_random_uuid(),
  applicant_id   uuid not null references auth.users(id) on delete cascade,
  status         verification_status not null default 'unverified',
  method         text,
  notes          text,
  reviewed_by    uuid references auth.users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger trg_verification_updated before update on verification_records
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
--  Review / admin-only data
-- ---------------------------------------------------------------------------
create table if not exists admin_notes (
  id             uuid primary key default gen_random_uuid(),
  applicant_id   uuid not null references auth.users(id) on delete cascade,
  author_id      uuid references auth.users(id),
  body           text not null,
  created_at     timestamptz not null default now()
);
create index if not exists idx_admin_notes_applicant on admin_notes(applicant_id);

create table if not exists applicant_flags (
  id             uuid primary key default gen_random_uuid(),
  applicant_id   uuid not null references auth.users(id) on delete cascade,
  flag           flag_type not null,
  label          text,
  created_by     uuid references auth.users(id),
  created_at     timestamptz not null default now()
);
create index if not exists idx_flags_applicant on applicant_flags(applicant_id);

create table if not exists favorites (
  admin_id     uuid not null references auth.users(id) on delete cascade,
  applicant_id uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (admin_id, applicant_id)
);

create table if not exists compatibility_categories (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  label       text not null,
  weight      numeric not null default 1.0,
  sort_order  int not null default 0
);

create table if not exists compatibility_scores (
  id             uuid primary key default gen_random_uuid(),
  applicant_id   uuid not null references auth.users(id) on delete cascade,
  category_key   text not null,
  score          numeric check (score >= 0 and score <= 100),
  override_score numeric check (override_score >= 0 and override_score <= 100),
  notes          text,
  version        int not null default 1,
  scored_by      uuid references auth.users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (applicant_id, category_key, version)
);
create trigger trg_compat_updated before update on compatibility_scores
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
--  AI analysis (stored separately from applicant-submitted data)
-- ---------------------------------------------------------------------------
create table if not exists ai_prompt_versions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  version     text not null,
  template    text not null,
  created_at  timestamptz not null default now(),
  unique (name, version)
);

create table if not exists ai_analysis (
  id             uuid primary key default gen_random_uuid(),
  applicant_id   uuid not null references auth.users(id) on delete cascade,
  kind           text not null,       -- summary | readiness | concerns | ...
  content        jsonb not null,
  model          text,
  prompt_name    text,
  prompt_version text,
  generated_by   uuid references auth.users(id),
  created_at     timestamptz not null default now()
);
create index if not exists idx_ai_applicant on ai_analysis(applicant_id);

-- ---------------------------------------------------------------------------
--  Messaging
-- ---------------------------------------------------------------------------
create table if not exists conversations (
  id             uuid primary key default gen_random_uuid(),
  applicant_id   uuid not null references auth.users(id) on delete cascade,
  is_open        boolean not null default true,   -- admin can close anytime
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (applicant_id)
);
create trigger trg_conversations_updated before update on conversations
  for each row execute function set_updated_at();

create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id       uuid not null references auth.users(id),
  body            text not null,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists idx_messages_conversation on messages(conversation_id);

create table if not exists message_reports (
  id           uuid primary key default gen_random_uuid(),
  message_id   uuid references messages(id) on delete set null,
  reporter_id  uuid references auth.users(id),
  reason       text,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
--  Date scheduling
-- ---------------------------------------------------------------------------
create table if not exists date_invitations (
  id             uuid primary key default gen_random_uuid(),
  applicant_id   uuid not null references auth.users(id) on delete cascade,
  created_by     uuid references auth.users(id),
  status         date_status not null default 'proposed',
  mode           date_mode not null default 'virtual',
  proposed_at    timestamptz,
  location_label text,              -- never a home address
  instructions   text,
  response_deadline timestamptz,
  applicant_response text,
  admin_post_notes text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_dates_applicant on date_invitations(applicant_id);
create trigger trg_dates_updated before update on date_invitations
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
--  Notifications, consent, legal, CMS, settings
-- ---------------------------------------------------------------------------
create table if not exists notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  kind         notification_kind not null,
  title        text not null,
  body         text,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists idx_notifications_user on notifications(user_id);

create table if not exists consent_records (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  consent_key  text not null,
  consented    boolean not null,
  typed_name   text,
  ip_address   inet,
  user_agent   text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_consent_user on consent_records(user_id);

create table if not exists legal_document_versions (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null,
  title        text not null,
  body         text not null,
  version      int not null default 1,
  published    boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (slug, version)
);

create table if not exists site_content (
  key          text primary key,      -- e.g. 'hero.headline'
  value        jsonb not null,
  updated_by   uuid references auth.users(id),
  updated_at   timestamptz not null default now()
);

create table if not exists system_settings (
  key          text primary key,
  value        jsonb not null,
  updated_by   uuid references auth.users(id),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
--  Audit & privacy workflows
-- ---------------------------------------------------------------------------
create table if not exists audit_logs (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references auth.users(id),
  action       text not null,
  entity       text,
  entity_id    uuid,
  metadata     jsonb,
  ip_address   inet,
  created_at   timestamptz not null default now()
);
create index if not exists idx_audit_actor on audit_logs(actor_id);
create index if not exists idx_audit_entity on audit_logs(entity, entity_id);

create table if not exists data_export_requests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'requested',   -- requested | ready | delivered
  export_path  text,
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists deletion_requests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'requested',   -- requested | completed | rejected
  reason       text,
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);
