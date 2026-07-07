-- ─────────────────────────────────────────────────────────────────────────────
-- Auto-create a profiles row for every new auth user.
--
-- WHY: Before RLS was enabled, Auth.jsx's `supabase.from("profiles").upsert(...)`
-- succeeded even with no session because the anon role had unrestricted write
-- access. Once RLS is enabled (20260707_enable_rls_security.sql), that upsert
-- runs as `anon` at signup time (no session yet when email confirmation is on)
-- and is correctly denied — which would leave the profile row uncreated.
--
-- The standard Supabase pattern is a SECURITY DEFINER trigger on auth.users that
-- creates the profile server-side, independent of RLS. This keeps profiles
-- populated without granting the anon role any write access.
--
-- Kept in a separate migration from the RLS fix so, if profiles has an
-- unexpected NOT NULL column in some environment, it cannot roll back the
-- critical security migration.
--
-- Run AFTER 20260707_enable_rls_security.sql.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
