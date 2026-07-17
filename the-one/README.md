# The One

A production-oriented, full-stack **private matchmaking platform** built around a
single featured client. This is not a swipe-based dating app: men apply for the
opportunity to build a connection with **one** person. Every application is
reviewed privately and individually.

> **Working name:** "The One". Rebrand from one place — `src/config/site.ts`.
> **Tagline:** _One woman. One intentional path to connection._

This app lives in its own folder (`the-one/`) and is **completely independent**
of anything else in the repository — separate stack, dependencies, database, and
build.

---

## Status — Phases 1–4 complete

The build is delivered in phases (see [Implementation plan](#implementation-plan)).
**Phases 1–4 are implemented, typechecked, tested, and build cleanly.**

| Area | State |
| --- | --- |
| Project foundation (Next.js 14 App Router, TS, Tailwind, shadcn-style UI) | ✅ P1 |
| Design system + tokens (CSS variables, luxury editorial palette) | ✅ P1 |
| Central branding/config (`site.ts`, `content.ts`, `legal.ts`, `compatibility.ts`) | ✅ P1 |
| Public pages (landing, about, looking-for, how-it-works, safety, FAQ, 6 legal drafts) | ✅ P1 |
| Auth (register + email verify, login, password reset, sign-out) | ✅ P1 |
| Roles + protected routes (public / applicant / admin) via middleware + layouts | ✅ P1 |
| Full database schema (30+ tables), enums, triggers, indexes, constraints | ✅ P1 |
| Row Level Security policies for every table | ✅ P1 |
| Private storage buckets + signed-URL access model | ✅ P1 |
| Modular AI service layer (mock + OpenAI-ready) | ✅ P1 (scaffold) |
| Modular email layer (console + Resend-ready) + templates | ✅ P1 |
| Seed data (1 admin + 8 fictional applicants) | ✅ P1 |
| Applicant dashboard + admin command-center shells | ✅ P1 |
| **12-step application** (schema-driven, all steps) | ✅ P2 |
| **Autosave** (debounced) + progress bar + prev/next + per-field validation | ✅ P2 |
| **Media upload** (photos + video) to private bucket, signed-URL previews | ✅ P2 |
| **Consent & certification** (typed name + timestamp, all certifications) | ✅ P2 |
| **Review & submit** workflow (lock fields, application ID, email, notify admin) | ✅ P2 |
| **Applicant dashboard** (completion %, next action, notifications) | ✅ P2 |
| **Privacy controls** (download my data, withdraw, request deletion) | ✅ P2 |
| **Admin applicant table** (filters, sorting, favorites, photo/video/score/flags) | ✅ P3 |
| **Applicant detail page** (gallery, video, full application, timeline) | ✅ P3 |
| **Private notes, flags, favorites** (admin-only via RLS) | ✅ P3 |
| **Status controls** (shortlist/approve/pause/not-selected/archive/block/delete) | ✅ P3 |
| **Compatibility scoring UI** (per-category score + override + weighted overall) | ✅ P3 |
| **Request info / unlock messaging** actions + audit logging | ✅ P3 |
| **Messaging** (1:1 threads, read receipts, report, admin safety review, open/close) | ✅ P4 |
| **Date scheduling** (propose/accept/decline/suggest/reschedule/cancel/complete + notes) | ✅ P4 |
| **Notifications + email delivery** (submit, status, messaging, new message, dates) | ✅ P4 |
| Unit tests (auth + application validation + compatibility scoring — 18 passing) | ✅ |
| AI analysis UI, audit-log viewer, analytics, expanded tests | ▢ Phase 5 |

Later phases mount onto the already-built, role-guarded routes and schema.

---

## Tech stack

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · shadcn/ui-style
primitives · Radix · lucide-react · Supabase (Postgres + Auth + Storage + RLS) ·
Zod · React Hook Form · Vitest. Vercel-compatible. Stripe / Google Calendar /
Resend / OpenAI are wired as **modular, env-selected** integrations (mocked in dev).

---

## Quick start

```bash
cd the-one
cp .env.example .env.local        # fill in Supabase keys
npm install
npm run dev                       # http://localhost:3000
```

Without Supabase keys the public marketing site renders; auth and dashboards
need a Supabase project (below).

### Supabase setup

1. Create a project at [supabase.com](https://supabase.com). Copy the URL, anon
   key, and service-role key into `.env.local`.
2. Apply migrations (in order) from `supabase/migrations/` — via the Supabase
   CLI (`supabase db push`), the SQL editor, or the Supabase MCP.
3. Load reference data: run `supabase/seed.sql`.
4. Seed fictional accounts: `npm run seed` (needs `SUPABASE_SERVICE_ROLE_KEY`).
5. Promote your own admin: the seed makes `admin@theone.example`, or run
   `update profiles set role='admin' where id='<your-user-id>';`.

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest unit tests |
| `npm run seed` | Fictional dev seed (admin + 8 applicants) |

---

## Folder structure

```
the-one/
├─ src/
│  ├─ app/
│  │  ├─ (marketing)/        # public site: landing, about, looking-for,
│  │  │                      #   how-it-works, safety, faq, legal/[slug]
│  │  ├─ (auth)/             # login, register, forgot-password, actions
│  │  ├─ (dashboard)/        # applicant-only: dashboard + application + sub-pages
│  │  ├─ admin/              # admin-only command center
│  │  ├─ apply/              # application entry / closed state
│  │  ├─ auth/callback/      # Supabase email/magic-link callback
│  │  ├─ layout.tsx · globals.css · not-found.tsx · robots.ts
│  ├─ components/
│  │  ├─ ui/                 # button, card, input, label, accordion (shadcn-style)
│  │  ├─ marketing/          # header, footer, page-hero
│  │  └─ dashboard/          # shared dashboard pieces
│  ├─ features/auth/         # login/register/forgot forms (client)
│  ├─ config/                # site, content, legal, compatibility  ← EDIT COPY HERE
│  ├─ lib/
│  │  ├─ supabase/           # client, server, admin (service-role, server-only)
│  │  ├─ ai/                 # modular AI provider (mock + openai)
│  │  ├─ email/              # modular email provider + templates
│  │  ├─ validation/         # Zod schemas
│  │  ├─ auth.ts             # getSessionProfile / requireUser / requireRole
│  │  ├─ database.types.ts   # typed DB models
│  │  └─ utils.ts
│  └─ middleware.ts          # session refresh + route guards
├─ supabase/
│  ├─ migrations/            # 0001_init, 0002_rls, 0003_storage
│  └─ seed.sql               # reference/config seed
├─ scripts/seed.mjs          # fictional applicant seed
└─ README · SECURITY · PRIVACY_IMPLEMENTATION · DEPLOYMENT
```

## Entity-relationship overview

`auth.users` 1—1 `profiles` (role) and 1—1 `applicant_profiles`. Each applicant
has one `applications` row (status machine) with many `application_answers`
(EAV keyed by `assessment_questions`), `applicant_media`, `status_history`,
`compatibility_scores` (per `compatibility_categories`), `admin_notes`,
`applicant_flags`, `verification_records`, `ai_analysis`, one `conversations`
with many `messages`, and `date_invitations`. Cross-cutting: `notifications`,
`consent_records`, `legal_document_versions`, `site_content`, `system_settings`,
`audit_logs`, `data_export_requests`, `deletion_requests`. Full DDL:
`supabase/migrations/0001_init.sql`.

## Route map

| Route | Access | Notes |
| --- | --- | --- |
| `/`, `/about`, `/looking-for`, `/how-it-works`, `/safety`, `/faq`, `/legal/[slug]` | Public | Marketing + legal drafts |
| `/login`, `/register`, `/forgot-password` | Public | Supabase auth |
| `/apply` | Public → routes by role | Entry to the application |
| `/dashboard`, `/dashboard/*`, `/application` | Applicant | `requireRole('applicant')` |
| `/admin`, `/admin/*` | Admin | `requireRole('admin')` + middleware |
| `/auth/callback` | System | Email/magic-link exchange |

## Design tokens

Luxury editorial palette as CSS variables in `src/app/globals.css`, surfaced to
Tailwind in `tailwind.config.ts`: `--ink` (black), `--paper` (warm white),
`--cream`, `--gold` (muted), `--espresso`, `--burgundy` (accent). Serif display
(Cormorant Garamond) + sans (Inter). Reduced-motion and visible focus states
built in. Change the palette in one place to re-theme.

## Implementation plan

- **Phase 1 (done):** foundation, design system, public pages, auth, schema,
  roles, protected routes, RLS, storage, modular AI/email scaffolds, seed, tests.
- **Phase 2:** 12-step application (autosave, media upload, consent, review,
  submission workflow), full applicant dashboard.
- **Phase 3:** admin applicant table (filters/sort), detail page, notes, status
  changes, compatibility scoring UI.
- **Phase 4:** messaging, notifications, date scheduling, email delivery.
- **Phase 5:** AI analysis UI, audit log viewer, data export + deletion, analytics,
  expanded tests (RLS, e2e).

## Safety, privacy & AI notes

- Applicant scores, admin notes, flags, and AI output are **admin-only** at the
  database level (RLS) and never shown to applicants.
- Media is private; access is via short-lived signed URLs.
- AI is **decision-support only** — it never decides or rejects, never infers
  protected characteristics, never diagnoses, never claims media-based deception
  detection. A human is always the decision-maker.
- Legal pages are **drafts** — legal review required before launch.

See `SECURITY.md` and `PRIVACY_IMPLEMENTATION.md`.
