-- Voluntary, self-reported EEO self-identification on applications, so the
-- platform can measure adverse impact (the EEOC "4/5ths rule") across the hiring
-- funnel — the analysis required by NYC Local Law 144 and analogous statutes.
--
-- These are OPTIONAL and self-reported. They must NEVER be fed into an AI
-- evaluation/scoring prompt (the ai-query firewall scrubs them defensively);
-- they exist only for aggregate, de-identified bias monitoring.

alter table public.applications add column if not exists gender            text;
alter table public.applications add column if not exists ethnicity         text;
alter table public.applications add column if not exists veteran_status    text;
alter table public.applications add column if not exists disability_status text;

-- applications already has RLS enabled with an authenticated-only policy
-- (see 20260707_enable_rls_security.sql); these columns inherit it.
