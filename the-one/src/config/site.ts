/**
 * ────────────────────────────────────────────────────────────────────────────
 *  THE ONE — Central Site Configuration
 * ────────────────────────────────────────────────────────────────────────────
 *  This is the single source of truth for branding, copy hooks, and platform
 *  rules that are expected to change per-deployment. Change the project name,
 *  tagline, palette references, eligibility rules, and feature flags here — the
 *  rest of the application reads from this file.
 *
 *  Note: long-form editable page copy (About, Values, FAQ, Legal) lives in
 *  `src/config/content.ts` so profile copy stays fully separated from app logic
 *  and can be moved into the database-backed CMS later without touching code.
 */

export const siteConfig = {
  /** Working project name — change this to rebrand the entire platform. */
  name: "The One",
  shortName: "The One",
  tagline: "One woman. One intentional path to connection.",

  heroHeadline: "This is not another dating app.",
  heroSubhead: "It is a private invitation to pursue something real.",

  /** Contact + legal entity details (placeholders — replace before launch). */
  contactEmail: "hello@theone.example",
  legalEntity: "The One (working name)",

  /** Primary domain, used for canonical URLs / email links. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",

  /** Social links surfaced in the footer (empty string hides the icon). */
  social: {
    instagram: "",
    linkedin: "",
  },

  /** Whether the platform is currently accepting new applications. */
  applicationsOpen: true,
  applicationsClosedMessage:
    "Applications are temporarily closed. Please check back soon.",

  /** Featured person — the single client the platform is built around. */
  featured: {
    firstName: "The Featured Client",
    displayName: "Her",
    // Placeholder — the admin uploads the real hero image via the CMS.
    heroImageAlt: "Featured portrait",
  },
} as const;

/**
 * Platform rules that are enforced in validation and gating logic.
 * Keeping them here means product decisions live in one auditable place.
 */
export const platformRules = {
  /** Minimum applicant age. Enforced in the application schema + a DB check. */
  minimumAge: 30,

  /** Media upload limits (enforced client + server side). */
  media: {
    maxPhotoSizeMB: 10,
    maxVideoSizeMB: 200,
    maxVideoDurationSeconds: 180,
    minAdditionalPhotos: 2,
    allowedImageTypes: ["image/jpeg", "image/png", "image/webp"],
    allowedVideoTypes: ["video/mp4", "video/quicktime", "video/webm"],
  },

  /** Messaging is locked until the admin approves the applicant. */
  messagingRequiresApproval: true,
} as const;

/** Application-visible statuses. Internal analysis is never shown to applicants. */
export const APPLICANT_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "additional_info_requested",
  "shortlisted",
  "approved_to_connect",
  "messaging_open",
  "date_invited",
  "dating",
  "paused",
  "not_selected",
  "withdrawn",
  "blocked",
  "archived",
] as const;

export type ApplicantStatus = (typeof APPLICANT_STATUSES)[number];

/** Respectful, applicant-facing labels. Never expose internal review language. */
export const APPLICANT_STATUS_LABELS: Record<ApplicantStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  additional_info_requested: "Additional Information Requested",
  shortlisted: "Under Consideration",
  approved_to_connect: "Approved to Connect",
  messaging_open: "Messaging Open",
  date_invited: "Date Invitation",
  dating: "Connected",
  paused: "Paused",
  not_selected: "Not Selected at This Time",
  withdrawn: "Withdrawn",
  blocked: "Closed",
  archived: "Closed",
};

export type Role = "public" | "applicant" | "admin";
