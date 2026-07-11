-- Human-in-the-loop gate for AI assessment scoring.
--
-- Previously score-assessment auto-advanced an application's status straight
-- from the AI score (no human sign-off) — an automated employment decision.
-- These columns let the AI record a *recommendation* while a human makes the
-- actual stage change, with provenance for who decided and when.

alter table public.applications add column if not exists ai_recommended_status text;
alter table public.applications add column if not exists ai_recommendation_at   timestamptz;
alter table public.applications add column if not exists decided_by             uuid;
alter table public.applications add column if not exists decided_at             timestamptz;

-- applications already has RLS with an authenticated-only policy
-- (20260707_enable_rls_security.sql); these columns inherit it.
