/**
 * ────────────────────────────────────────────────────────────────────────────
 *  Editable long-form site copy — kept separate from application logic.
 * ────────────────────────────────────────────────────────────────────────────
 *  All copy here is placeholder/editorial and intended to be replaced. None of
 *  it invents intimate personal facts about a real person. Later this content
 *  can be migrated into the `site_content` table and edited from the admin CMS.
 */

export const aboutContent = {
  intro:
    "A short, editable introduction. This space is intentionally reserved so the featured client can tell her own story, in her own words.",
  sections: [
    {
      title: "Personal Story",
      body: "Placeholder copy describing a personal journey — where she comes from, what shaped her, and the values she carries forward. Replace with a genuine, first-person narrative.",
    },
    {
      title: "Career & Ambition",
      body: "Placeholder copy about professional life, purpose, and ambition. A partner should be able to celebrate and support a driven, accomplished woman.",
    },
    {
      title: "Faith",
      body: "Placeholder copy describing the role of faith and how it grounds daily life and long-term decisions.",
    },
    {
      title: "Family Values",
      body: "Placeholder copy about family, roots, and the kind of home she hopes to build.",
    },
    {
      title: "Lifestyle",
      body: "Placeholder copy about pace of life, travel, wellness, and the everyday rhythms that matter.",
    },
    {
      title: "Personality",
      body: "Placeholder copy conveying warmth, wit, and depth without cliché.",
    },
    {
      title: "Hobbies",
      body: "Placeholder copy about the pursuits and interests that bring joy and balance.",
    },
    {
      title: "Long-Term Vision",
      body: "Placeholder copy about the future — partnership, legacy, and a life built with intention.",
    },
    {
      title: "What I Value in a Relationship",
      body: "Placeholder copy about the qualities that make a relationship healthy, safe, and lasting.",
    },
    {
      title: "What I Am Not Looking For",
      body: "Placeholder copy that respectfully clarifies incompatibilities without disparaging anyone.",
    },
  ],
} as const;

export const lookingForContent = {
  intro:
    "Clarity is a kindness. The following describes the character and readiness that matter most.",
  categories: [
    { title: "Character", items: ["Integrity", "Kindness", "Humility", "Consistency"] },
    { title: "Faith & Values", items: ["Shared spiritual foundation", "Aligned values", "Service to others"] },
    { title: "Emotional Maturity", items: ["Self-awareness", "Accountability", "Regulation under stress"] },
    { title: "Communication", items: ["Honesty", "Directness with warmth", "Repair after conflict"] },
    { title: "Leadership", items: ["Steady presence", "Shared decision-making", "Healthy responsibility"] },
    { title: "Family Vision", items: ["Clear intentions", "Alignment on children", "Commitment to home"] },
    { title: "Financial Responsibility", items: ["Stewardship", "Stability", "Shared philosophy"] },
    { title: "Health & Lifestyle", items: ["Care for wellbeing", "Balance", "Sustainable habits"] },
    { title: "Purpose", items: ["A sense of calling", "Ambition with grounding"] },
    { title: "Relationship Readiness", items: ["Available", "Intentional", "Ready to build"] },
  ],
  dealBreakers: [
    "Dishonesty or hidden circumstances",
    "Unavailability or ambiguity about intentions",
    "Disrespect toward others",
  ],
  nonNegotiables: [
    "Single and legally free to pursue a relationship",
    "Willingness to move at a thoughtful, respectful pace",
    "Commitment to honesty",
  ],
  preferences: [
    "Shared faith and values",
    "Emotional intelligence",
    "A settled, purpose-driven life",
  ],
} as const;

export const howItWorksSteps = [
  { title: "Create an account", body: "Register privately and verify your email." },
  { title: "Complete the private application", body: "Work through the application at your own pace. Progress saves automatically." },
  { title: "Submit photos and a video introduction", body: "Recent, authentic media stored privately and securely." },
  { title: "Complete the compatibility assessment", body: "Thoughtful questions on values, readiness, and vision." },
  { title: "Application review", body: "Each application is reviewed privately and individually." },
  { title: "Optional follow-up questions", body: "You may be asked for additional information." },
  { title: "Invitation to connect", body: "If there is alignment, you may receive an invitation to message." },
  { title: "Private conversation", body: "Secure, controlled messaging — only after approval." },
  { title: "Date scheduling", body: "If mutual interest continues, a date may be proposed." },
] as const;

export const howItWorksDisclaimer =
  "Submitting an application does not guarantee a response, approval, conversation, or date. Every application is considered privately and individually.";

export const safetyPoints = [
  "Your data is private and is never sold.",
  "Profiles are not public — applicants cannot browse one another.",
  "Contact information stays hidden until it is intentionally shared.",
  "Messaging is controlled and only opens after approval.",
  "Harassment of any kind results in immediate removal.",
  "Providing false information may result in rejection.",
  "Background screening may be requested before a meeting.",
  "You may withdraw consent at any time.",
  "Information can be deleted upon request, subject to legal retention requirements.",
] as const;

export const faqItems = [
  {
    q: "Is this a real matchmaking platform?",
    a: "Yes. It is a private, application-based matchmaking experience built around one featured client. It is not a swipe-based dating app.",
  },
  {
    q: "Why is there only one woman?",
    a: "This platform is intentionally singular. Every application is for the opportunity to build a connection with one person, reviewed privately and individually.",
  },
  {
    q: "Who can apply?",
    a: "Adult men who meet the eligibility requirements, including the minimum age, and who are single and genuinely ready for a serious relationship.",
  },
  {
    q: "Is there an application fee?",
    a: "No. There is no fee to apply.",
  },
  {
    q: "Is my information public?",
    a: "No. Your profile, photos, video, and answers are private. Applicants cannot see one another.",
  },
  {
    q: "Will every applicant receive a response?",
    a: "No. Submitting an application does not guarantee a response, approval, conversation, or date.",
  },
  {
    q: "Can I edit my application?",
    a: "You can edit freely while your application is a draft. After submission, core fields are locked, though you may update limited contact details.",
  },
  {
    q: "Can I withdraw?",
    a: "Yes, at any time, from your dashboard. You may also request deletion of your data.",
  },
  {
    q: "Is a background check required?",
    a: "Background screening may be requested before an in-person meeting. You will always be informed and asked to consent.",
  },
  {
    q: "When does messaging become available?",
    a: "Messaging only unlocks after an application is approved. It remains private and controlled.",
  },
  {
    q: "What happens after approval?",
    a: "If approved, you may be invited to a private conversation, and — if there is continued mutual interest — a date may be proposed.",
  },
] as const;

export const eligibilityRequirements = [
  "You are at least the minimum required age.",
  "You are single and legally free to pursue a relationship.",
  "You are genuinely ready for a serious, intentional relationship.",
  "You can provide recent, authentic photos and a short video introduction.",
  "You agree to the community standards and private review process.",
] as const;

export const valuesContent = [
  { title: "Confidence", body: "Grounded self-assurance, without arrogance." },
  { title: "Exclusivity", body: "A singular, private, considered process." },
  { title: "Maturity", body: "Emotional intelligence and steadiness." },
  { title: "Intentionality", body: "Every step is deliberate and respectful." },
  { title: "Faith", body: "A shared foundation of meaning and values." },
  { title: "Readiness", body: "Prepared to build something real and lasting." },
] as const;
