# Privacy Implementation

How privacy-by-default is realized in **The One**.

## Principles

- Profiles are **never public**. Applicants cannot browse or discover one another.
- Contact details (email, phone), exact address, employer, photos, video, and
  application responses are **never exposed publicly**.
- Internal analysis (scores, notes, flags, AI output, review status) is
  **admin-only** and never shown to applicants.

## What is collected

Account details, structured profile fields, questionnaire answers, photos and a
video introduction, messages, consent records, and technical/session metadata
(IP, user agent) recorded on consent and audit events.

## Where it is enforced

| Concern | Mechanism |
| --- | --- |
| Only-own-data access | RLS policies (`0002_rls.sql`) on every table |
| Admin-only internal data | No applicant-facing RLS policy on notes/flags/scores/AI |
| Private media | Private Storage bucket + owner-scoped storage policies + signed URLs |
| Hidden contact info | Contact fields never rendered in applicant-visible surfaces; shared only intentionally |
| Applicant-facing status language | `APPLICANT_STATUS_LABELS` in `site.ts` — respectful, limited wording |
| No ranking/leaderboards | Applicant dashboard shows no counts of other applicants |

## Consent

- Terms + Privacy consent is captured at registration (`terms_accepted_at` on the
  profile) and, per-action, in `consent_records` with typed name, timestamp, IP,
  and user agent.
- Application certification (Step 11) records explicit consents (truthfulness,
  single status, review, verification, community standards, no off-platform
  contact) — stored in `consent_records`.

## Data subject rights

- **Export my data** — `data_export_requests` table + workflow (Phase 5 UI). Users
  can download a copy of submitted information.
- **Withdraw** — applicant can set status to `withdrawn` from the dashboard.
- **Delete my account/data** — `deletion_requests` table + workflow. Deletion
  removes or irreversibly anonymizes personal data, subject to legal retention.
- **Deletion confirmation** — a `deletion_confirmed` notification/email is sent.

## Retention

- Retention windows are configured in `system_settings`. Certain records may be
  retained where legally required or for fraud prevention/dispute resolution, as
  disclosed in the Privacy Policy and Data Deletion Policy drafts.

## AI & privacy

- AI input is limited to applicant-submitted, non-protected fields.
- AI must not infer protected characteristics, diagnose mental health, or claim
  deception detection (enforced as guardrails in `src/lib/ai/provider.ts`).
- AI results are stored **separately** (`ai_analysis`) with model id, prompt name,
  prompt version, and generation history — never mixed into submitted data.

## Auditing

- `audit_logs` capture actor, action, entity, metadata, and IP. They are
  append-only under RLS (no update/delete), providing a tamper-evident trail.
