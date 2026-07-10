-- ─────────────────────────────────────────────────────────────────────────────
-- Enable Row-Level Security (RLS) across all public tables + baseline policies.
--
-- WHY: The browser client (src/supabase.js) connects with the *public* anon key,
-- which ships inside the JavaScript bundle. With RLS DISABLED, anyone who reads
-- that key out of the bundle can read, edit, or delete every row in every public
-- table straight from the REST API — this is what the Supabase Security Advisor
-- reported as "RLS Disabled in Public" (12 errors) and "Policy Exists RLS
-- Disabled" (applications, profiles).
--
-- HOW THE APP WORKS (so these policies don't break it):
--   * App.jsx gates the ENTIRE UI behind Supabase Auth — including the
--     offer-signing, onboarding, and assessment token pages — via
--     `if (!session) return <Auth/>`. Every data path therefore runs as the
--     `authenticated` role.
--   * Edge functions that intentionally bypass these rules (calculate-payroll,
--     approve-payroll-run, create-employee-login, revoke-employee-access) use
--     the service_role key, which is EXEMPT from RLS. They are unaffected.
--
-- WHAT THIS MIGRATION DOES:
--   1. Enables RLS on every table in the `public` schema.
--   2. Grants the `authenticated` role full CRUD on the application tables, so
--      the logged-in app keeps working exactly as before.
--   3. Restricts `profiles` writes to the caller's own row (prevents a signed-in
--      user from tampering with other users' profile rows).
--   4. Leaves the `anon` role with NO policies -> anon has NO table access.
--
-- This migration is authoritative and idempotent: it drops any pre-existing
-- policies on the tables it manages before recreating them, normalizing the
-- half-configured policy state the advisor flagged.
--
-- Run in the Supabase SQL Editor, or `supabase db push`.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Enable RLS on every table in the public schema. --------------------------
--    Tables not covered by an explicit policy below end up locked to the
--    service_role only, which is the safe default.
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security;', r.tablename);
  end loop;
end $$;

-- 2. Authenticated = full access on the internal application tables. ----------
do $$
declare
  app_tables text[] := array[
    'applications','candidate_assessments','certifications','channels',
    'compensation_bands','contractors','departments','employee_onboarding_docs',
    'employees','engagement_scores','er_cases','flight_risk_scores','goals',
    'interviews','job_requisitions','labor_costs','messages','offers',
    'pay_stubs','payroll_runs','performance_reviews','required_documents',
    'salary_structure','training_courses','training_modules','training_records'
  ];
  r record;
  t text;
begin
  -- Drop existing policies on every table we manage (app tables + profiles) so
  -- this migration lands in a known, deterministic state.
  for r in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any(app_tables || array['profiles'])
  loop
    execute format('drop policy if exists %I on public.%I;', r.policyname, r.tablename);
  end loop;

  -- Recreate a single full-access policy for authenticated users per table.
  foreach t in array app_tables loop
    if to_regclass('public.' || t) is not null then
      execute format(
        'create policy %I on public.%I for all to authenticated using (true) with check (true);',
        t || '_authenticated_all', t
      );
    end if;
  end loop;
end $$;

-- 3. profiles: readable by any authenticated user, writable only for own row. -
--    profiles.id == auth.users.id (see Auth.jsx signup upsert), so auth.uid()
--    identifies the caller's own row.
do $$
begin
  if to_regclass('public.profiles') is not null then
    execute 'create policy profiles_select_authenticated on public.profiles
               for select to authenticated using (true)';
    execute 'create policy profiles_insert_self on public.profiles
               for insert to authenticated with check (id = auth.uid())';
    execute 'create policy profiles_update_self on public.profiles
               for update to authenticated using (id = auth.uid()) with check (id = auth.uid())';
  end if;
end $$;
