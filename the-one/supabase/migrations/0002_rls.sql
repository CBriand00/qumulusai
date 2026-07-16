-- ============================================================================
--  The One — Row Level Security
--  Principles:
--   * Applicants can only ever see/edit their OWN data.
--   * Applicants can NEVER see admin notes, flags, scores, AI analysis, other
--     applicants, or other conversations.
--   * Admin (is_admin()) can access all applicant records.
--   * Audit logs are append-only and never editable by applicants.
--   * Role escalation is blocked (see guard trigger in 0001).
--   * The service role bypasses RLS for trusted server-side operations.
-- ============================================================================

-- Enable RLS everywhere.
alter table profiles                  enable row level security;
alter table applications              enable row level security;
alter table applicant_profiles        enable row level security;
alter table application_sections      enable row level security;
alter table assessment_questions      enable row level security;
alter table assessment_options        enable row level security;
alter table application_answers       enable row level security;
alter table status_history            enable row level security;
alter table applicant_media           enable row level security;
alter table verification_records      enable row level security;
alter table admin_notes               enable row level security;
alter table applicant_flags           enable row level security;
alter table favorites                 enable row level security;
alter table compatibility_categories  enable row level security;
alter table compatibility_scores      enable row level security;
alter table ai_prompt_versions        enable row level security;
alter table ai_analysis               enable row level security;
alter table conversations             enable row level security;
alter table messages                  enable row level security;
alter table message_reports           enable row level security;
alter table date_invitations          enable row level security;
alter table notifications             enable row level security;
alter table consent_records           enable row level security;
alter table legal_document_versions   enable row level security;
alter table site_content              enable row level security;
alter table system_settings           enable row level security;
alter table audit_logs                enable row level security;
alter table data_export_requests      enable row level security;
alter table deletion_requests         enable row level security;

-- ---------------------------------------------------------------------------
--  profiles
-- ---------------------------------------------------------------------------
create policy profiles_select_self on profiles
  for select using (id = auth.uid() or is_admin());
create policy profiles_update_self on profiles
  for update using (id = auth.uid() or is_admin());
-- Insert handled by the SECURITY DEFINER signup trigger.

-- ---------------------------------------------------------------------------
--  applications  (owner is applicant_id; admin sees all)
-- ---------------------------------------------------------------------------
create policy applications_select on applications
  for select using (applicant_id = auth.uid() or is_admin());
create policy applications_insert on applications
  for insert with check (applicant_id = auth.uid());
-- Applicants may update only while the application is not locked (draft/info
-- requested). Admins may always update (e.g. status changes).
create policy applications_update on applications
  for update using (
    is_admin()
    or (applicant_id = auth.uid() and locked_at is null)
  );

-- ---------------------------------------------------------------------------
--  applicant_profiles
-- ---------------------------------------------------------------------------
create policy applicant_profiles_rw on applicant_profiles
  for all using (applicant_id = auth.uid() or is_admin())
  with check (applicant_id = auth.uid() or is_admin());

-- ---------------------------------------------------------------------------
--  application_answers  (owner via parent application)
-- ---------------------------------------------------------------------------
create policy answers_select on application_answers
  for select using (
    is_admin() or exists (
      select 1 from applications a
      where a.id = application_answers.application_id and a.applicant_id = auth.uid()
    )
  );
create policy answers_write on application_answers
  for all using (
    is_admin() or exists (
      select 1 from applications a
      where a.id = application_answers.application_id
        and a.applicant_id = auth.uid()
        and a.locked_at is null
    )
  )
  with check (
    is_admin() or exists (
      select 1 from applications a
      where a.id = application_answers.application_id
        and a.applicant_id = auth.uid()
        and a.locked_at is null
    )
  );

-- ---------------------------------------------------------------------------
--  Public reference data: sections, questions, options are readable by any
--  authenticated user (needed to render the application). Admin writes only.
-- ---------------------------------------------------------------------------
create policy sections_read on application_sections
  for select using (auth.role() = 'authenticated');
create policy sections_admin_write on application_sections
  for all using (is_admin()) with check (is_admin());

create policy questions_read on assessment_questions
  for select using (auth.role() = 'authenticated');
create policy questions_admin_write on assessment_questions
  for all using (is_admin()) with check (is_admin());

create policy options_read on assessment_options
  for select using (auth.role() = 'authenticated');
create policy options_admin_write on assessment_options
  for all using (is_admin()) with check (is_admin());

create policy compat_categories_read on compatibility_categories
  for select using (auth.role() = 'authenticated');
create policy compat_categories_admin_write on compatibility_categories
  for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
--  status_history  (applicant may read own; only admin/service writes)
-- ---------------------------------------------------------------------------
create policy status_history_select on status_history
  for select using (
    is_admin() or exists (
      select 1 from applications a
      where a.id = status_history.application_id and a.applicant_id = auth.uid()
    )
  );
create policy status_history_admin_insert on status_history
  for insert with check (is_admin());

-- ---------------------------------------------------------------------------
--  Media  (owner can read/write own; admin can read all)
-- ---------------------------------------------------------------------------
create policy media_select on applicant_media
  for select using (applicant_id = auth.uid() or is_admin());
create policy media_write on applicant_media
  for all using (applicant_id = auth.uid())
  with check (applicant_id = auth.uid());

-- ---------------------------------------------------------------------------
--  Verification  (applicant reads own status; admin manages)
-- ---------------------------------------------------------------------------
create policy verification_select on verification_records
  for select using (applicant_id = auth.uid() or is_admin());
create policy verification_admin_write on verification_records
  for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
--  ADMIN-ONLY tables: notes, flags, favorites, scores, AI. Applicants have no
--  access whatsoever (no policy grants them select).
-- ---------------------------------------------------------------------------
create policy admin_notes_admin_only on admin_notes
  for all using (is_admin()) with check (is_admin());
create policy flags_admin_only on applicant_flags
  for all using (is_admin()) with check (is_admin());
create policy favorites_admin_only on favorites
  for all using (is_admin()) with check (is_admin());
create policy compat_scores_admin_only on compatibility_scores
  for all using (is_admin()) with check (is_admin());
create policy ai_prompts_admin_only on ai_prompt_versions
  for all using (is_admin()) with check (is_admin());
create policy ai_analysis_admin_only on ai_analysis
  for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
--  Messaging  (participant = the applicant on the conversation, or admin)
-- ---------------------------------------------------------------------------
create policy conversations_select on conversations
  for select using (applicant_id = auth.uid() or is_admin());
create policy conversations_admin_write on conversations
  for all using (is_admin()) with check (is_admin());

create policy messages_select on messages
  for select using (
    is_admin() or exists (
      select 1 from conversations c
      where c.id = messages.conversation_id and c.applicant_id = auth.uid()
    )
  );
-- Sender must be a participant, the conversation must be open, and the
-- applicant may only send as themselves.
create policy messages_insert on messages
  for insert with check (
    sender_id = auth.uid() and (
      is_admin() or exists (
        select 1 from conversations c
        where c.id = messages.conversation_id
          and c.applicant_id = auth.uid()
          and c.is_open = true
      )
    )
  );
create policy messages_update_read on messages
  for update using (
    is_admin() or exists (
      select 1 from conversations c
      where c.id = messages.conversation_id and c.applicant_id = auth.uid()
    )
  );

create policy message_reports_insert on message_reports
  for insert with check (reporter_id = auth.uid() or is_admin());
create policy message_reports_select on message_reports
  for select using (is_admin());

-- ---------------------------------------------------------------------------
--  Dates  (applicant reads/responds to own; admin manages)
-- ---------------------------------------------------------------------------
create policy dates_select on date_invitations
  for select using (applicant_id = auth.uid() or is_admin());
create policy dates_admin_write on date_invitations
  for all using (is_admin()) with check (is_admin());
-- Applicant may update only their response fields on their own invitation.
create policy dates_applicant_respond on date_invitations
  for update using (applicant_id = auth.uid());

-- ---------------------------------------------------------------------------
--  Notifications & consent  (owner)
-- ---------------------------------------------------------------------------
create policy notifications_select on notifications
  for select using (user_id = auth.uid() or is_admin());
create policy notifications_update on notifications
  for update using (user_id = auth.uid());
create policy notifications_admin_insert on notifications
  for insert with check (is_admin() or user_id = auth.uid());

create policy consent_select on consent_records
  for select using (user_id = auth.uid() or is_admin());
create policy consent_insert on consent_records
  for insert with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
--  Legal docs & public CMS content: world-readable (published), admin writes.
-- ---------------------------------------------------------------------------
create policy legal_read on legal_document_versions
  for select using (published = true or is_admin());
create policy legal_admin_write on legal_document_versions
  for all using (is_admin()) with check (is_admin());

create policy site_content_read on site_content
  for select using (true);
create policy site_content_admin_write on site_content
  for all using (is_admin()) with check (is_admin());

create policy settings_admin_only on system_settings
  for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
--  Audit logs: append-only. Admin reads. NO updates/deletes for anyone via
--  the anon/auth roles (service role bypasses RLS for system writes).
-- ---------------------------------------------------------------------------
create policy audit_select_admin on audit_logs
  for select using (is_admin());
create policy audit_insert on audit_logs
  for insert with check (auth.role() = 'authenticated');
-- No update/delete policies => updates and deletes are denied under RLS.

-- ---------------------------------------------------------------------------
--  Privacy workflows: owner creates, admin manages.
-- ---------------------------------------------------------------------------
create policy export_owner on data_export_requests
  for select using (user_id = auth.uid() or is_admin());
create policy export_insert on data_export_requests
  for insert with check (user_id = auth.uid());
create policy export_admin_update on data_export_requests
  for update using (is_admin());

create policy deletion_owner on deletion_requests
  for select using (user_id = auth.uid() or is_admin());
create policy deletion_insert on deletion_requests
  for insert with check (user_id = auth.uid());
create policy deletion_admin_update on deletion_requests
  for update using (is_admin());
