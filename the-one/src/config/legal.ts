/**
 * Editable legal document drafts.
 *
 * ⚠️  DRAFTS ONLY — these placeholders must be reviewed and approved by a
 * qualified attorney before launch. They are not legal advice.
 *
 * Each document is keyed by its URL slug. Bodies are simple paragraph arrays so
 * they can later be moved into `legal_document_versions` in the database.
 */

export interface LegalDoc {
  slug: string;
  title: string;
  updated: string;
  body: string[];
}

export const LEGAL_REVIEW_NOTICE =
  "This document is a working draft. Legal review is required before launch. It does not constitute legal advice.";

export const legalDocs: Record<string, LegalDoc> = {
  terms: {
    slug: "terms",
    title: "Terms of Use",
    updated: "Draft",
    body: [
      "Welcome. By creating an account or submitting an application, you agree to these Terms of Use. If you do not agree, do not use the platform.",
      "Eligibility. You must be at least the minimum required age and legally able to enter into agreements. You must provide truthful, accurate information.",
      "Account responsibilities. You are responsible for maintaining the confidentiality of your credentials and for all activity under your account.",
      "Acceptable use. You agree not to harass, deceive, impersonate, or misuse the platform, and not to share private platform content outside the platform.",
      "No guarantee. Submitting an application does not guarantee a response, approval, conversation, or date. Access to messaging and other features is granted at the platform's discretion.",
      "Termination. We may suspend or remove accounts that violate these terms or community standards.",
      "Disclaimers and limitation of liability. The platform is provided on an 'as is' basis to the fullest extent permitted by law.",
      "Changes. We may update these terms; continued use constitutes acceptance of the updated terms.",
    ],
  },
  privacy: {
    slug: "privacy",
    title: "Privacy Policy",
    updated: "Draft",
    body: [
      "Overview. Your privacy is central to this platform. This policy explains what we collect, how we use it, and your rights.",
      "Information we collect. Account details, application responses, uploaded photos and video, messages, consent records, and technical/session metadata.",
      "How we use information. To review applications, operate the matchmaking process, ensure safety, and comply with legal obligations.",
      "Sharing. We do not sell your information. Access is restricted to the platform administrator and service providers strictly necessary to operate the service.",
      "Storage and security. Media is stored in private storage and served only via short-lived signed URLs. Access is governed by row-level security.",
      "Your rights. You may access, export, correct, or request deletion of your data, subject to legal retention requirements.",
      "Retention. We retain data only as long as necessary for the purposes described or as required by law.",
      "Contact. Requests can be made from your dashboard or by contacting us.",
    ],
  },
  "community-standards": {
    slug: "community-standards",
    title: "Community Standards",
    updated: "Draft",
    body: [
      "Respect. Treat everyone with dignity. Harassment, coercion, or intimidation of any kind results in immediate removal.",
      "Honesty. Provide truthful information. Misrepresentation may result in rejection or removal.",
      "Privacy. Do not attempt to contact the featured client outside approved platform channels. Do not share private platform content.",
      "Safety. Report concerns promptly. We may request identity verification or background screening before an in-person meeting.",
      "Consequences. Violations may result in warnings, suspension, blocking, or permanent removal at the platform's discretion.",
    ],
  },
  consent: {
    slug: "consent",
    title: "Consent & Disclosure",
    updated: "Draft",
    body: [
      "Voluntary participation. Participation is voluntary and you may withdraw at any time.",
      "Review consent. By submitting an application, you consent to private review of your submitted information.",
      "Verification consent. You consent to identity verification and, where applicable, background screening if requested, with prior notice.",
      "No guarantee disclosure. You understand that submission does not guarantee contact, approval, conversation, or a date.",
      "Data processing. You consent to the processing of your information as described in the Privacy Policy.",
    ],
  },
  "data-deletion": {
    slug: "data-deletion",
    title: "Data Deletion Policy",
    updated: "Draft",
    body: [
      "Your right to deletion. You may request deletion of your account and personal data at any time from your dashboard.",
      "What is deleted. Your profile, application responses, uploaded media, and messages are removed or irreversibly anonymized.",
      "Legal retention. Certain records may be retained where required by law, for fraud prevention, or to resolve disputes.",
      "Timing. Deletion requests are processed promptly. You will receive confirmation when the request is completed.",
      "Backups. Residual copies in backups are purged on our standard backup rotation schedule.",
    ],
  },
  cookies: {
    slug: "cookies",
    title: "Cookie Policy",
    updated: "Draft",
    body: [
      "What cookies we use. We use strictly necessary cookies for authentication and session management.",
      "Analytics. Any analytics are privacy-respecting and used only to understand aggregate usage.",
      "Managing cookies. You can control cookies through your browser settings; disabling necessary cookies may prevent sign-in.",
    ],
  },
};

export const legalSlugs = Object.keys(legalDocs);
