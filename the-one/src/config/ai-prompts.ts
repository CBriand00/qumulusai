/**
 * ────────────────────────────────────────────────────────────────────────────
 *  AI prompt registry (versioned).
 * ────────────────────────────────────────────────────────────────────────────
 *  Every stored AI result records the prompt name + version used, so analyses
 *  remain auditable and reproducible. Bump the version when a template changes.
 *
 *  All templates carry the same guardrails: decision-support only; do not infer
 *  protected characteristics; do not diagnose; do not claim deception detection
 *  from media; a human makes all decisions.
 */
import type { AnalysisKind } from "@/lib/ai/provider";

export interface PromptDef {
  kind: AnalysisKind;
  label: string;
  name: string;
  version: string;
  template: string;
}

const GUARDRAIL =
  "You are a decision-support assistant for a human matchmaker. Do not make or " +
  "recommend a final decision. Do not infer protected characteristics (race, " +
  "religion beyond what is stated, health, etc.). Do not diagnose mental health. " +
  "Do not claim to detect deception. Base output only on the applicant's own words.";

export const aiPrompts: Record<AnalysisKind, PromptDef> = {
  summary: { kind: "summary", label: "Applicant summary", name: "applicant_summary", version: "1.0.0", template: `${GUARDRAIL}\nWrite a concise, respectful summary of this applicant based on their answers.` },
  relationship_readiness: { kind: "relationship_readiness", label: "Relationship readiness", name: "readiness", version: "1.0.0", template: `${GUARDRAIL}\nSummarize signals of relationship readiness and intentionality, citing the applicant's words.` },
  compatibility_overview: { kind: "compatibility_overview", label: "Compatibility overview", name: "compatibility_overview", version: "1.0.0", template: `${GUARDRAIL}\nGive a balanced overview across values, communication, and vision.` },
  strengths: { kind: "strengths", label: "Potential strengths", name: "strengths", version: "1.0.0", template: `${GUARDRAIL}\nList potential strengths as bullet points.` },
  concerns: { kind: "concerns", label: "Potential concerns", name: "concerns", version: "1.0.0", template: `${GUARDRAIL}\nList potential areas to explore further (not verdicts) as bullet points.` },
  contradictions: { kind: "contradictions", label: "Possible contradictions", name: "contradictions", version: "1.0.0", template: `${GUARDRAIL}\nNote any apparent inconsistencies between answers, phrased as questions to clarify.` },
  follow_up_questions: { kind: "follow_up_questions", label: "Suggested follow-ups", name: "follow_ups", version: "1.0.0", template: `${GUARDRAIL}\nSuggest thoughtful follow-up questions.` },
  first_date_topics: { kind: "first_date_topics", label: "First-date topics", name: "first_date_topics", version: "1.0.0", template: `${GUARDRAIL}\nSuggest respectful first-date conversation topics.` },
  communication_style: { kind: "communication_style", label: "Communication style", name: "communication_style", version: "1.0.0", template: `${GUARDRAIL}\nDescribe the applicant's apparent communication style from their writing.` },
  values_summary: { kind: "values_summary", label: "Values summary", name: "values_summary", version: "1.0.0", template: `${GUARDRAIL}\nSummarize the applicant's stated core values.` },
};

export const aiKinds = Object.keys(aiPrompts) as AnalysisKind[];
