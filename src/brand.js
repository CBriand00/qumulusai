// ─────────────────────────────────────────────────────────────────────────────
// Brand + company configuration — the single place to white-label this platform.
// To re-skin for another company: edit the values below (and the accent tokens
// in theme.js). Everything the user sees and everything the AI says about the
// company flows from here.
// ─────────────────────────────────────────────────────────────────────────────

export const brand = {
  name:        "QumulusAI",                 // full product/company name
  // Wordmark split so the accent letters can be colored (Q…AI).
  wordmark:    { lead: "Q", body: "umulus", tail: "AI" },
  tagline:     "People Operating System",
  website:     "https://www.qumulusai.com",
  support:     "people@qumulusai.com",
  emailDomain: "qumulusai.com",
  accent:      "#00C2E0",                   // wordmark highlight; full palette in theme.js
};

// Company context — the facts every AI feature needs so it speaks accurately.
// Swap these for a new brand and the AI stops talking about GPUs and Georgia.
export const company = {
  name:        brand.name,
  description: "a vertically integrated AI infrastructure company providing bare-metal GPU cloud services",
  location:    "Marietta, Georgia",
  mission:     "to universalize access to AI compute",
  ceo:         "Mike Maniscalco",
  stage:       "scaling rapidly from 18 to 300+ employees after securing $500M in financing",
  roles:       "GPU Infrastructure Engineers, AI Solutions Architects, Data Center Operations, and Enterprise Sales",
};

// Ready-made context sentence for AI system prompts. Interpolate this instead of
// hardcoding company facts, e.g. `You are ${brand.name}'s coach. ${companyBlurb} ...`
export const companyBlurb =
  `${company.name} is ${company.description}, based in ${company.location}. ` +
  `The company's mission is ${company.mission}. ${company.name} is ${company.stage}. ` +
  `CEO is ${company.ceo}. Roles are highly technical: ${company.roles}.`;
