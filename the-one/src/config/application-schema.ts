/**
 * ────────────────────────────────────────────────────────────────────────────
 *  Application schema — the 12-step application, described as data.
 * ────────────────────────────────────────────────────────────────────────────
 *  A schema-driven form keeps the large questionnaire maintainable and editable
 *  in one place (and later movable into the `assessment_questions` table).
 *
 *  Storage model:
 *   - Fields with `profileColumn` are written to `applicant_profiles` (queried,
 *     structured data).
 *   - All other fields are stored in `application_answers` keyed by `key` (EAV),
 *     so the questionnaire can evolve without schema churn.
 *
 *  Steps 10 (media), 11 (consent), 12 (review) are handled by dedicated UI and
 *  have no generic fields here.
 */
import { platformRules } from "@/config/site";

export type FieldType =
  | "text"
  | "textarea"
  | "email"
  | "tel"
  | "url"
  | "number"
  | "date"
  | "select"
  | "scale" // 1–5
  | "boolean";

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  help?: string;
  /** Shows a sensitive-data notice near the field. */
  sensitive?: boolean;
  /** If set, the value is stored on applicant_profiles rather than as an answer. */
  profileColumn?: string;
}

export interface Step {
  /** 1-based step number. */
  index: number;
  key: string;
  title: string;
  description?: string;
  /** Generic fields; empty for special steps (media/consent/review). */
  fields: Field[];
  /** Special renderer, if any. */
  special?: "media" | "consent" | "review";
}

const YES_NO_UNSURE = ["Yes", "No", "Unsure"];

export const applicationSteps: Step[] = [
  {
    index: 1,
    key: "basic_information",
    title: "Basic Information",
    description: "Let's start with the essentials.",
    fields: [
      { key: "legal_first_name", label: "Legal first name", type: "text", required: true, profileColumn: "legal_first_name" },
      { key: "preferred_name", label: "Preferred name", type: "text", profileColumn: "preferred_name" },
      { key: "last_name", label: "Last name", type: "text", required: true, profileColumn: "last_name" },
      { key: "date_of_birth", label: "Date of birth", type: "date", required: true, profileColumn: "date_of_birth", help: `You must be at least ${platformRules.minimumAge}.` },
      { key: "city", label: "City", type: "text", required: true, profileColumn: "city" },
      { key: "state", label: "State / Province", type: "text", required: true, profileColumn: "state" },
      { key: "country", label: "Country", type: "text", required: true, profileColumn: "country" },
      { key: "phone", label: "Phone number", type: "tel", profileColumn: "phone", sensitive: true, help: "Kept private and never shared without your consent." },
      { key: "height_cm", label: "Height (cm)", type: "number", profileColumn: "height_cm" },
      { key: "pronouns", label: "Pronouns", type: "text", profileColumn: "pronouns" },
      { key: "occupation", label: "Occupation", type: "text", required: true, profileColumn: "occupation" },
      { key: "employer", label: "Employer", type: "text", profileColumn: "employer" },
      { key: "industry", label: "Industry", type: "text", profileColumn: "industry" },
      { key: "education_level", label: "Education level", type: "select", profileColumn: "education_level", options: ["High school", "Some college", "Associate", "Bachelor's", "Master's", "Doctorate", "Professional"] },
      { key: "linkedin_url", label: "LinkedIn URL", type: "url", profileColumn: "linkedin_url" },
      { key: "instagram_url", label: "Instagram URL", type: "url", profileColumn: "instagram_url" },
      { key: "website_url", label: "Personal website", type: "url", profileColumn: "website_url" },
      { key: "age_confirm", label: `I confirm I am at least ${platformRules.minimumAge} years old.`, type: "boolean", required: true, profileColumn: "age_confirmed_over_min" },
    ],
  },
  {
    index: 2,
    key: "relationship_status",
    title: "Relationship Status",
    description: "Honest answers help ensure this is a good fit.",
    fields: [
      { key: "relationship_status", label: "Current relationship status", type: "select", required: true, profileColumn: "relationship_status", options: ["Single", "Divorced", "Widowed", "Separated"] },
      { key: "marital_history", label: "Marital history", type: "select", options: ["Never married", "Divorced", "Widowed"] },
      { key: "serious_relationships", label: "Number of serious relationships", type: "number" },
      { key: "recent_relationship_end", label: "When did your most recent relationship end?", type: "text", placeholder: "e.g. 2023" },
      { key: "recent_relationship_length", label: "Length of most recent relationship", type: "text" },
      { key: "recent_relationship_reason", label: "Why did it end?", type: "textarea", sensitive: true },
      { key: "has_children", label: "Do you have children?", type: "boolean", profileColumn: "has_children" },
      { key: "children_details", label: "Number and ages of children", type: "text", sensitive: true },
      { key: "wants_children", label: "Do you want children?", type: "select", profileColumn: "wants_children", options: YES_NO_UNSURE },
      { key: "open_partner_children", label: "Open to a partner with children?", type: "select", options: YES_NO_UNSURE },
      { key: "custody", label: "Current custody arrangement (if applicable)", type: "text", sensitive: true },
      { key: "emotionally_available", label: "Are you emotionally available?", type: "select", options: YES_NO_UNSURE },
      { key: "dating_others", label: "Are you actively dating other people?", type: "boolean" },
    ],
  },
  {
    index: 3,
    key: "faith_values",
    title: "Faith & Values",
    fields: [
      { key: "faith_identification", label: "Religious or spiritual identification", type: "text" },
      { key: "faith_practices", label: "Faith practices", type: "textarea" },
      { key: "church_involvement", label: "Church / community involvement", type: "textarea" },
      { key: "faith_importance", label: "Importance of faith in daily life", type: "scale" },
      { key: "faith_marriage_expectations", label: "Expectations for faith in marriage", type: "textarea" },
      { key: "spiritual_leadership_views", label: "Views on spiritual leadership", type: "textarea" },
      { key: "core_values", label: "Core personal values", type: "textarea" },
      { key: "integrity_definition", label: "How do you define integrity?", type: "textarea" },
      { key: "commitment_definition", label: "How do you define commitment?", type: "textarea" },
      { key: "fidelity_views", label: "Views on fidelity", type: "textarea" },
      { key: "marriage_views", label: "Views on marriage", type: "textarea" },
      { key: "premarital_counseling_views", label: "Views on premarital counseling", type: "select", options: ["Open to it", "Neutral", "Prefer not"] },
      { key: "service_activity", label: "Service or charitable activity", type: "textarea" },
    ],
  },
  {
    index: 4,
    key: "career_financial",
    title: "Career & Financial Life",
    description: "Income is collected as a range, never an exact figure.",
    fields: [
      { key: "career_goals", label: "Career goals", type: "textarea" },
      { key: "work_schedule", label: "Work schedule", type: "text" },
      { key: "travel_expectations", label: "Travel expectations", type: "text" },
      { key: "income_range", label: "Income range", type: "select", profileColumn: "income_range", sensitive: true, options: ["Prefer not to say", "Under $50k", "$50k–$100k", "$100k–$200k", "$200k–$350k", "$350k–$500k", "$500k+"] },
      { key: "debt_comfort", label: "Comfort level with debt", type: "scale" },
      { key: "savings_habits", label: "Savings habits", type: "textarea" },
      { key: "financial_philosophy", label: "Financial philosophy", type: "textarea" },
      { key: "shared_finances_views", label: "Views on shared finances", type: "textarea" },
      { key: "household_roles_views", label: "Views on household roles", type: "textarea" },
      { key: "housing_situation", label: "Current housing situation", type: "text" },
      { key: "willing_relocate", label: "Willing to relocate?", type: "select", options: YES_NO_UNSURE },
      { key: "geographic_flexibility", label: "Geographic flexibility", type: "textarea" },
    ],
  },
  {
    index: 5,
    key: "lifestyle",
    title: "Lifestyle",
    fields: [
      { key: "smoking", label: "Smoking", type: "select", options: ["Never", "Occasionally", "Regularly"] },
      { key: "vaping", label: "Vaping", type: "select", options: ["Never", "Occasionally", "Regularly"] },
      { key: "alcohol", label: "Alcohol use", type: "select", options: ["Never", "Socially", "Regularly"] },
      { key: "recreational_drugs", label: "Recreational drug use", type: "select", options: ["Never", "Occasionally", "Regularly"] },
      { key: "fitness", label: "Fitness habits", type: "textarea" },
      { key: "nutrition", label: "Nutrition habits", type: "text" },
      { key: "sleep", label: "Sleep habits", type: "text" },
      { key: "travel_frequency", label: "Travel frequency", type: "text" },
      { key: "weekend_activities", label: "Preferred weekend activities", type: "textarea" },
      { key: "hobbies", label: "Hobbies", type: "textarea" },
      { key: "pets", label: "Pets", type: "text" },
      { key: "political_orientation", label: "Political orientation", type: "select", sensitive: true, options: ["Prefer not to say", "Conservative", "Moderate", "Liberal", "Other"] },
      { key: "homebody_social", label: "Homebody or social?", type: "scale", help: "1 = homebody, 5 = very social" },
    ],
  },
  {
    index: 6,
    key: "emotional_intelligence",
    title: "Emotional Intelligence",
    fields: [
      { key: "conflict_resolution", label: "How do you approach conflict resolution?", type: "textarea", required: true },
      { key: "communication_under_stress", label: "How do you communicate under stress?", type: "scale" },
      { key: "accountability", label: "How readily do you take accountability?", type: "scale" },
      { key: "therapy_growth", label: "Experience with therapy or personal development", type: "textarea" },
      { key: "ei_wrong", label: "Describe a time you were wrong in a relationship.", type: "textarea", required: true },
      { key: "ei_last_lesson", label: "What did your last relationship teach you about yourself?", type: "textarea", required: true },
      { key: "ei_space", label: "How do you respond when someone you love needs space?", type: "textarea", required: true },
      { key: "ei_safety", label: "What does emotional safety mean to you?", type: "textarea", required: true },
      { key: "ei_repair_trust", label: "How do you repair trust after conflict?", type: "textarea", required: true },
      { key: "ei_pattern", label: "One pattern you are actively working to change?", type: "textarea", required: true },
    ],
  },
  {
    index: 7,
    key: "leadership_partnership",
    title: "Leadership & Partnership",
    fields: [
      { key: "leadership_meaning", label: "What does healthy leadership in a relationship mean to you?", type: "textarea", required: true },
      { key: "major_decisions", label: "How do you make major decisions?", type: "textarea" },
      { key: "support_ambitious_partner", label: "How do you support an ambitious partner?", type: "textarea", required: true },
      { key: "partner_earns_more", label: "How do you feel about a partner who earns more than you?", type: "textarea" },
      { key: "daily_partnership", label: "What does partnership look like in daily life?", type: "textarea" },
      { key: "household_division", label: "How should household responsibilities be divided?", type: "textarea" },
      { key: "protect_time", label: "How do you protect time for a relationship?", type: "textarea" },
      { key: "handle_disagreement", label: "How do you respond when your partner strongly disagrees with you?", type: "textarea", required: true },
    ],
  },
  {
    index: 8,
    key: "relationship_vision",
    title: "Relationship Vision",
    fields: [
      { key: "why_now", label: "Why are you seeking a relationship now?", type: "textarea", required: true },
      { key: "relationship_to_build", label: "What kind of relationship are you prepared to build?", type: "textarea", required: true },
      { key: "marriage_meaning", label: "What does marriage mean to you?", type: "textarea" },
      { key: "healthy_home", label: "What does a healthy home feel like?", type: "textarea" },
      { key: "non_negotiables", label: "What are your relationship non-negotiables?", type: "textarea", required: true },
      { key: "deal_breakers", label: "What are your deal breakers?", type: "textarea", required: true },
      { key: "affection_expectations", label: "Expectations around affection", type: "textarea" },
      { key: "communication_expectations", label: "Expectations around communication", type: "textarea" },
      { key: "intentional_time", label: "How often should couples spend intentional time together?", type: "text" },
      { key: "friendship_in_romance", label: "What role should friendship play in romance?", type: "textarea" },
      { key: "five_years", label: "Where do you see yourself in five years?", type: "textarea" },
      { key: "legacy", label: "What legacy do you want to build?", type: "textarea" },
    ],
  },
  {
    index: 9,
    key: "personal_introduction",
    title: "Personal Introduction",
    fields: [
      { key: "short_bio", label: "Short written biography", type: "textarea", required: true, profileColumn: "short_bio" },
      { key: "why_applying", label: "Why are you interested in applying?", type: "textarea", required: true },
      { key: "why_compatible", label: "What makes you compatible?", type: "textarea", required: true },
      { key: "what_you_bring", label: "What would you bring to a relationship?", type: "textarea", required: true },
      { key: "proudest_accomplishment", label: "Your proudest accomplishment", type: "textarea" },
      { key: "challenge_overcome", label: "A challenge you overcame", type: "textarea" },
      { key: "currently_building", label: "Something you are currently building", type: "textarea" },
      { key: "three_words", label: "Three words close friends would use to describe you", type: "text", required: true },
      { key: "first_date_question", label: "One question you would ask on a first date", type: "text", required: true },
    ],
  },
  { index: 10, key: "media", title: "Media Upload", description: "Recent, authentic photos and a short video introduction.", fields: [], special: "media" },
  { index: 11, key: "consent", title: "Consent & Certification", fields: [], special: "consent" },
  { index: 12, key: "review", title: "Review & Submit", fields: [], special: "review" },
];

export const TOTAL_STEPS = applicationSteps.length;

/** The certifications an applicant must affirm in Step 11. */
export const consentItems = [
  { key: "truthful", label: "All information I have provided is truthful." },
  { key: "legally_single", label: "I am legally single and free to pursue a relationship." },
  { key: "no_coercion", label: "I am not applying under coercion." },
  { key: "no_guarantee", label: "I understand submission does not guarantee contact, approval, conversation, or a date." },
  { key: "private_review", label: "I consent to private review of my application." },
  { key: "community_standards", label: "I agree to the community standards." },
  { key: "no_share_content", label: "I agree not to share private site content." },
  { key: "false_info", label: "I understand false information may result in removal." },
  { key: "identity_verification", label: "I consent to identity verification if requested." },
  { key: "background_screening", label: "I understand background screening may be requested." },
  { key: "no_offplatform_contact", label: "I agree not to contact the featured woman outside approved platform channels." },
] as const;

/** Fields that remain editable after submission (limited contact updates). */
export const editableAfterSubmit = new Set(["phone", "linkedin_url", "instagram_url", "website_url"]);
