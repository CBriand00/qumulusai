# Security

Security model and checklist for **The One**.

## Authentication & roles

- Auth is handled by Supabase (email + password, email verification, password
  reset). Magic-link and MFA are supported by the provider and can be enabled in
  the Supabase dashboard without code changes.
- Three roles: `public`, `applicant`, `admin` — stored on `profiles.role`.
- **New accounts are always `applicant`.** Role is set by a `SECURITY DEFINER`
  signup trigger (`handle_new_user`); it can never be supplied by the client.
- A `guard_profile_privileged_fields` trigger blocks any non-admin from changing
  `role` or `is_suspended` — **role escalation is impossible from client code.**
- Admins are promoted manually via SQL. Applicants can never reach admin routes:
  enforced in `middleware.ts`, again in `requireRole()` layouts, and
  authoritatively by RLS.

## Route protection (defense in depth)

1. `middleware.ts` refreshes the session and redirects unauthenticated users
   away from `/dashboard`, `/admin`, `/application`; verifies admin role for
   `/admin`.
2. Server layouts call `requireRole()` and redirect on mismatch.
3. **RLS is the ultimate guard** — even a forged request can only read/write
   what the signed-in user's policies allow.

## Row Level Security (summary)

Every table has RLS enabled (`0002_rls.sql`). Highlights:

- Applicants see/edit **only their own** application, profile, answers, media,
  messages, notifications, consent, dates.
- Admin-only tables (`admin_notes`, `applicant_flags`, `favorites`,
  `compatibility_scores`, `ai_analysis`, `ai_prompt_versions`, `system_settings`)
  grant applicants **no access at all**.
- Submitted applications lock (`locked_at`): applicant writes are denied by
  policy once locked; only permitted fields change via admin/service paths.
- Messages can only be inserted by a conversation participant while the
  conversation `is_open`; the admin can close messaging at any time.
- `audit_logs` are **append-only** — there are insert/select policies but no
  update/delete policies, so modifications are denied under RLS.

## Secrets

- `SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY` / `RESEND_API_KEY` are
  **server-only**. The service-role client (`src/lib/supabase/admin.ts`) and both
  provider modules import `server-only` so they can never be bundled into client
  code.
- Only `NEXT_PUBLIC_*` values reach the browser; the anon key is always
  RLS-restricted.

## Storage

- Applicant media lives in a **private** bucket, namespaced by user id
  (`<user_id>/...`). Storage policies restrict read/write to the owner (admins
  may read). Downloads use short-lived signed URLs generated server-side.

## Uploads (Phase 2 enforcement, limits defined now)

- Allowed types and size/duration limits are centralized in
  `platformRules.media` (`src/config/site.ts`) and enforced client- and
  server-side at upload time.

## Rate limiting & lockout

- Supabase applies auth rate limits by default. Application-level rate limiting
  and account lockout hooks are part of the auth architecture and are enabled at
  the edge/middleware layer before launch.

## Known dependency advisories

- `next` is pinned to a patched `14.2.x` (≥ 14.2.35), which resolves the
  2025-12-11 Next.js advisory.
- `npm audit` reports 2 issues in a **transitive `postcss`** inside Next's own
  build toolchain (not runtime). The only "fix" is a Next 16 major upgrade,
  deferred as a deliberate, separate migration.

## Pre-launch security checklist

- [ ] Rotate all keys; confirm no secrets committed.
- [ ] Enable email confirmations and (optionally) MFA in Supabase.
- [ ] Review and tighten each RLS policy against production data.
- [ ] Run Supabase advisors (`get_advisors`) and resolve findings.
- [ ] Configure CSP, HSTS, and security headers.
- [ ] Enable production rate limiting + account lockout.
- [ ] Legal review of all documents in `src/config/legal.ts`.
- [ ] Confirm private buckets are not public; verify signed-URL TTLs.
- [ ] Penetration test auth and role boundaries.
