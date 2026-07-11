# New Tenant Setup — White-Labeling This Platform

This app is **single-tenant**: each company gets its **own Supabase project** and
its **own deployment**. Data isolation comes from separate projects — never put
two companies in one database. Follow this runbook to stand up the system for a
new company (referred to below as *AcmeCo*).

Everything a new tenant needs to change is either a **config value** (Supabase
keys, env vars) or **branding** (`src/brand.js`, `src/theme.js`) — no application
rewrite required.

---

## Architecture at a glance

- **Frontend** — Vite + React single-page app. Branding and all company-specific
  copy live in `src/brand.js`; colors in `src/theme.js`.
- **Backend** — a Supabase project: Postgres + Auth + Edge Functions. There is no
  separate server to run.
- **Schema** — `supabase/migrations/*.sql`. Demo data — `supabase/seed.sql`.
- **AI / privileged logic** — `supabase/functions/*` (Deno edge functions) calling
  Anthropic and People Data Labs.

---

## 1. Copy the repo

Fork or clone this repo into a new one for AcmeCo. Keep all of `supabase/` — every
tenant needs the same schema, migrations, and functions.

## 2. Create the Supabase project

Create a new project in the [Supabase dashboard](https://supabase.com/dashboard)
for AcmeCo. From **Project Settings → API**, copy:

- **Project URL** → `VITE_SUPABASE_URL`
- **anon / public key** → `VITE_SUPABASE_ANON_KEY`
- **service_role key** — used by edge functions only (keep secret).

From **Project Settings → General**, note the **Reference ID** (project ref).

## 3. Configure the frontend env vars

```bash
cp .env.example .env.local
# edit .env.local with AcmeCo's VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

`src/supabase.js` reads these at build time and **throws if they are missing**, so
a misconfigured deploy fails fast instead of silently connecting to the wrong
project. For production, set the same two vars in your host (e.g. **Vercel →
Settings → Environment Variables**) **before** deploying.

## 4. Apply the database schema

Link the CLI to AcmeCo's project and push every migration:

```bash
supabase link --project-ref <acmeco-ref>
supabase db push          # applies everything in supabase/migrations/ in order
```

(Or paste each file in `supabase/migrations/` into the SQL Editor, in filename
order.)

> ### 🔒 SECURITY GATE — RLS is mandatory
> The `*_enable_rls_security.sql` migration turns on Row-Level Security. Without
> it, the public anon key (which ships in the browser bundle) can read and modify
> **every row** in the database. **Never deploy a tenant without it.** Verify
> afterward in **Supabase → Advisors → Security** — it should report no
> "RLS Disabled in Public" errors.

> ### Note on the demo migrations
> `20260704_cleanup_test_and_duplicate_apps.sql` and
> `20260704_cleanup_extra_chro_apps.sql` are QumulusAI **demo-data** cleanups.
> They are safe no-ops on a fresh database and can be skipped for a new tenant.

## 5. Seed real data (replace the demo)

`supabase/seed.sql` contains QumulusAI's demo departments/employees. Replace it
with AcmeCo's real org data — or start empty and let the app create records. Do
**not** load the QumulusAI seed into a real tenant.

## 6. Deploy the edge functions + secrets

```bash
supabase functions deploy   # deploys all functions in supabase/functions/
supabase secrets set ANTHROPIC_API_KEY=sk-ant-... PDL_API_KEY=...
```

Functions in this project:

| Function                | Purpose                                   | Secrets used            |
|-------------------------|-------------------------------------------|-------------------------|
| `ai-query`              | General AI assistant / coaching           | `ANTHROPIC_API_KEY`     |
| `generate-assessment`   | Build candidate assessment                | `ANTHROPIC_API_KEY`     |
| `score-assessment`      | Score candidate assessment                | `ANTHROPIC_API_KEY`     |
| `source-candidates`     | Candidate sourcing                        | `PDL_API_KEY`           |
| `calculate-payroll`     | Payroll calculation                       | service_role*           |
| `approve-payroll-run`   | Approve a payroll run                     | service_role*           |
| `create-employee-login` | Provision an employee auth login          | service_role*           |
| `revoke-employee-access`| Revoke an employee's access               | service_role*           |

\* `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are
injected into every function automatically — you do not set them.

**Company identity for edge functions** — candidate/new-hire emails and a few AI
prompts live server-side in edge functions, so they read company identity from
secrets (not `brand.js`). Set these per tenant, or they fall back to QumulusAI:

```bash
supabase secrets set \
  COMPANY_NAME="Acme Corp" \
  COMPANY_CONTEXT="a fintech company building payments infrastructure, based in Austin, TX" \
  APP_URL="https://acme-hr.vercel.app"
```

## 7. Rebrand — the complete checklist

White-labeling is centralized in two config surfaces (`brand.js` for the app,
edge-function secrets for server-side copy). Work through all of these:

**Frontend config**
- [ ] **`src/brand.js`** → `name`, `wordmark` (split so accent letters color
  correctly), `tagline`, `website`, `support`, `emailDomain`, `accent`. **And**
  the `company` block (`description`, `location`, `mission`, `ceo`, `stage`,
  `roles`) — this feeds AI prompts via `companyBlurb` and now also drives the
  Careers footer and default sourcing location.
- [ ] **`src/theme.js`** → color tokens for the new palette.
- [ ] **`index.html`** → the `<title>`.
- [ ] Swap **logo / favicon** assets.

**Demo content to replace** (company-specific, not driven by `brand.js`)
- [ ] **`src/Careers.jsx`** → the `ROLES` array is QumulusAI's GPU job postings.
  Replace with the new company's open roles (titles, descriptions, locations).
- [ ] **`supabase/seed.sql`** → QumulusAI demo employees/departments (see step 5).

**Server-side identity** (edge-function secrets, step 6)
- [ ] `COMPANY_NAME`, `COMPANY_CONTEXT`, `APP_URL`.

**Connection** (never hardcoded anymore — all env-driven)
- [ ] Frontend: `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (step 3).
- [ ] Functions: `SUPABASE_URL` is auto-injected — nothing to set.

Sanity check for stray hardcoded copy:

```bash
grep -rniE "qumulus|atlanta|marietta|gpu" src supabase/functions index.html
# remaining hits should only be brand.js/theme.js values you intend, the Careers
# ROLES you're replacing, or the QumulusAI fallback defaults in edge functions.
```

## 8. Configure Auth

In AcmeCo's Supabase project (**Authentication → URL Configuration** and **Email
Templates**):

- Set **Site URL** and **Redirect URLs** to AcmeCo's production domain (and
  `http://localhost:5173` for local dev).
- Customize confirmation / password-reset email templates.
- Decide whether to require email confirmation.

## 9. Deploy the frontend

Deploy to Vercel/Netlify with the two `VITE_SUPABASE_*` env vars set. Build
command `npm run build`, output `dist/`.

---

## New-tenant checklist

- [ ] New Supabase project created; URL + anon + service_role keys captured
- [ ] `.env.local` (dev) and host env vars (prod) set
- [ ] All migrations applied (`supabase db push`)
- [ ] **RLS verified green in Security Advisor**
- [ ] Demo seed replaced with real data
- [ ] Edge functions deployed; `ANTHROPIC_API_KEY` + `PDL_API_KEY` set
- [ ] `brand.js`, `theme.js`, `index.html`, logo/favicon updated
- [ ] Auth site/redirect URLs + email templates configured
- [ ] Frontend deployed with env vars; login + one AI feature smoke-tested
