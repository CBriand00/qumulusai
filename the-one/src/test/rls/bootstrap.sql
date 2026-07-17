-- ============================================================================
--  RLS test bootstrap — emulates the Supabase runtime on plain Postgres so the
--  RLS policies in supabase/migrations/0002_rls.sql can be exercised for real.
--
--  Provides: the anon / authenticated / service_role roles, an `auth` schema
--  with a users table, and auth.uid()/auth.role() reading PostgREST-style GUCs.
--  Applied BEFORE the app migrations (0001_init, 0002_rls). Storage (0003) is
--  Supabase-specific and is covered separately.
-- ============================================================================

create extension if not exists pgcrypto;
create extension if not exists citext;

do $$ begin create role anon nologin;                     exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin;            exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls;   exception when duplicate_object then null; end $$;

create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

-- Supabase-compatible helpers. auth.uid() reads the JWT `sub`; auth.role()
-- reads the JWT `role`, falling back to the current DB role.
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create or replace function auth.role() returns text language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), current_user);
$$;

-- PostgREST grants table privileges to anon/authenticated and lets RLS decide.
-- Apply the same default so the policies (not missing GRANTs) gate access.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
