"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { getAIProvider, type AnalysisKind } from "@/lib/ai/provider";
import { aiPrompts } from "@/config/ai-prompts";

export interface AiResult {
  ok: boolean;
  message?: string;
}

/**
 * Non-sensitive answer keys passed to the AI as context. Deliberately excludes
 * contact details, income, and political orientation so protected/sensitive
 * attributes are not fed to the model.
 */
const CONTEXT_ANSWER_KEYS = [
  "why_now", "relationship_to_build", "non_negotiables", "deal_breakers",
  "communication_expectations", "affection_expectations", "five_years", "legacy",
  "marriage_meaning", "healthy_home", "why_applying", "why_compatible",
  "what_you_bring", "three_words", "leadership_meaning", "support_ambitious_partner",
  "handle_disagreement", "ei_wrong", "ei_last_lesson", "ei_space", "ei_safety",
  "ei_repair_trust", "ei_pattern", "conflict_resolution", "faith_identification",
  "faith_importance", "core_values", "integrity_definition", "commitment_definition",
];

/** Generate (or regenerate) an AI analysis of a given kind for an applicant. */
export async function generateAnalysis(applicantId: string, kind: AnalysisKind): Promise<AiResult> {
  const admin = await requireRole("admin");
  const supabase = createClient();

  const prompt = aiPrompts[kind];
  if (!prompt) return { ok: false, message: "Unknown analysis kind." };

  // Build a non-sensitive context from the applicant's own words.
  const { data: app } = await supabase
    .from("applications")
    .select("id")
    .eq("applicant_id", applicantId)
    .maybeSingle<{ id: string }>();

  const { data: profile } = await supabase
    .from("applicant_profiles")
    .select("short_bio, occupation, relationship_status, wants_children")
    .eq("applicant_id", applicantId)
    .maybeSingle<Record<string, unknown>>();

  const context: Record<string, unknown> = { profile: profile ?? {} };
  if (app) {
    const { data: answers } = await supabase
      .from("application_answers")
      .select("question_key, value_text")
      .eq("application_id", app.id)
      .in("question_key", CONTEXT_ANSWER_KEYS)
      .returns<{ question_key: string; value_text: string | null }[]>();
    const map: Record<string, string> = {};
    for (const a of answers ?? []) if (a.value_text) map[a.question_key] = a.value_text;
    context.answers = map;
  }

  let result;
  try {
    result = await getAIProvider().generate({
      kind,
      applicantContext: context,
      promptName: prompt.name,
      promptVersion: prompt.version,
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "AI generation failed." };
  }

  // Store separately from applicant-submitted data; each call is a new row
  // (regeneration history is preserved).
  const { error } = await supabase.from("ai_analysis").insert({
    applicant_id: applicantId,
    kind,
    content: result.content,
    model: result.model,
    prompt_name: result.promptName,
    prompt_version: result.promptVersion,
    generated_by: admin.id,
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/admin/applicants/${applicantId}`);
  return { ok: true };
}
