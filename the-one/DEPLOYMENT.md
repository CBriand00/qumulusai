# Deployment

Deploying **The One** (Vercel + Supabase).

## 1. Supabase (database + auth + storage)

1. Create a Supabase project. Note the Project URL, `anon` key, and
   `service_role` key.
2. Apply migrations in order:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_rls.sql`
   - `supabase/migrations/0003_storage.sql`

   With the CLI:
   ```bash
   supabase link --project-ref <ref>
   supabase db push
   ```
   Or paste each file into the SQL editor, or apply via the Supabase MCP
   `apply_migration` tool.
3. Load reference data: run `supabase/seed.sql`.
4. Auth settings: enable **Confirm email**. Set the Site URL and add
   `https://<your-domain>/auth/callback` to the redirect allow-list. Optionally
   enable MFA and magic links.
5. Storage: confirm the `applicant-media` bucket is **private** and
   `public-assets` is public (created by `0003_storage.sql`).
6. Create your admin: sign up through the app, then
   `update profiles set role='admin' where id='<your-user-id>';`
   (Do **not** ship the fictional seed accounts to production.)

## 2. Vercel (Next.js app)

1. Import the repository. Set the **Root Directory** to `the-one`.
2. Framework preset: Next.js. Build command `next build` (default).
3. Environment variables (from `.env.example`):
   - `NEXT_PUBLIC_SITE_URL` = your production URL
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server env only — never a `NEXT_PUBLIC_`)
   - `AI_PROVIDER` (`mock` until Phase 5), `OPENAI_API_KEY`, `AI_MODEL`
   - `EMAIL_PROVIDER` (`console` or `resend`), `RESEND_API_KEY`, `EMAIL_FROM`
   - Stripe / Google Calendar vars remain unset until those features are enabled.
4. Deploy. Verify the marketing site, then registration + email verification,
   then applicant and admin dashboards.

## 3. Email (Resend)

Set `EMAIL_PROVIDER=resend` and `RESEND_API_KEY`. Verify your sending domain in
Resend and set `EMAIL_FROM` to an address on it. In development the default
`console` provider logs email instead of sending.

## 4. Post-deploy checks

- [ ] `npm run build` succeeds locally and on Vercel.
- [ ] Middleware redirects work (anon → `/login`, applicant → away from `/admin`).
- [ ] RLS: an applicant cannot read another applicant's rows (spot-check).
- [ ] Media uploads land in the private bucket and load via signed URL.
- [ ] Run Supabase advisors and resolve findings.
- [ ] Complete the checklists in `SECURITY.md` and `PRIVACY_IMPLEMENTATION.md`.
- [ ] Legal review of `src/config/legal.ts`.

## Launch checklist

- [ ] Rebrand values in `src/config/site.ts` (name, tagline, contact, social).
- [ ] Replace placeholder copy in `src/config/content.ts` and `legal.ts`.
- [ ] Upload real hero image/logo to `public-assets`.
- [ ] Set `applicationsOpen` appropriately.
- [ ] Remove/disable fictional seed accounts.
- [ ] Configure custom domain + security headers.
- [ ] Confirm analytics/monitoring.
