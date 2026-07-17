-- ============================================================================
--  The One — Private storage buckets & policies
--  All applicant media is PRIVATE. Access is via short-lived signed URLs
--  generated server-side. Files are namespaced by the owner's user id:
--      applicant-media/<user_id>/<filename>
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('applicant-media', 'applicant-media', false)
on conflict (id) do nothing;

-- Public marketing assets (hero image, logo) — readable by anyone.
insert into storage.buckets (id, name, public)
values ('public-assets', 'public-assets', true)
on conflict (id) do nothing;

-- Applicants may read/write only objects under their own user-id prefix.
create policy "applicant media read own"
  on storage.objects for select
  using (
    bucket_id = 'applicant-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "applicant media insert own"
  on storage.objects for insert
  with check (
    bucket_id = 'applicant-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "applicant media update own"
  on storage.objects for update
  using (
    bucket_id = 'applicant-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "applicant media delete own"
  on storage.objects for delete
  using (
    bucket_id = 'applicant-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admin may read all applicant media (for review).
create policy "applicant media admin read"
  on storage.objects for select
  using (bucket_id = 'applicant-media' and public.is_admin());

-- Public assets: anyone can read; only admin can write.
create policy "public assets read"
  on storage.objects for select
  using (bucket_id = 'public-assets');

create policy "public assets admin write"
  on storage.objects for all
  using (bucket_id = 'public-assets' and public.is_admin())
  with check (bucket_id = 'public-assets' and public.is_admin());
