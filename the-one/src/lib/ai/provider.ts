import "server-only";

/**
 * ────────────────────────────────────────────────────────────────────────────
 *  Modular AI service layer (decision-support ONLY).
 * ────────────────────────────────────────────────────────────────────────────
 *  The provider is selected by env (`AI_PROVIDER`). A mock provider runs by
 *  default so development needs no API key. Swap in OpenAI (or any compatible
 *  provider) without touching call sites.
 *
 *  Guardrails baked into this layer:
 *   - AI never makes or automates decisions. It returns text for a human.
 *   - It must not infer protected characteristics or diagnose mental health.
 *   - It must not claim to detect deception from media.
 *  Results are always stored separately from applicant-submitted data, with a
 *  model id, prompt name, and prompt version (see the ai_analysis table).
 */

export type AnalysisKind =
  | "summary"
  | "relationship_readiness"
  | "compatibility_overview"
  | "strengths"
  | "concerns"
  | "contradictions"
  | "follow_up_questions"
  | "first_date_topics"
  | "communication_style"
  | "values_summary";

export interface AnalysisRequest {
  kind: AnalysisKind;
  /** Only applicant-submitted, non-protected fields should be passed in. */
  applicantContext: Record<string, unknown>;
  promptName: string;
  promptVersion: string;
}

export interface AnalysisResult {
  kind: AnalysisKind;
  content: { text: string; items?: string[] };
  model: string;
  promptName: string;
  promptVersion: string;
  generatedAt: string;
}

export interface AIProvider {
  readonly model: string;
  generate(req: AnalysisRequest): Promise<AnalysisResult>;
}

const DECISION_SUPPORT_NOTE =
  "Decision-support only. Not a determination of character, honesty, safety, or relationship outcome.";

/** Deterministic mock provider — no network, safe for tests & local dev. */
class MockAIProvider implements AIProvider {
  readonly model = "mock-ai-1";
  async generate(req: AnalysisRequest): Promise<AnalysisResult> {
    const label = req.kind.replace(/_/g, " ");
    return {
      kind: req.kind,
      content: {
        text: `[${label}] ${DECISION_SUPPORT_NOTE} This is placeholder AI output generated locally without a provider key.`,
        items:
          req.kind === "follow_up_questions"
            ? [
                "Can you tell me more about what readiness looks like for you today?",
                "How do you approach repair after a disagreement?",
              ]
            : undefined,
      },
      model: this.model,
      promptName: req.promptName,
      promptVersion: req.promptVersion,
      generatedAt: new Date().toISOString(),
    };
  }
}

/**
 * OpenAI-compatible provider stub. Implement the fetch call when a key is
 * configured; the shape intentionally matches MockAIProvider so nothing else
 * changes. Left unimplemented on purpose until Phase 5 wiring + prompts land.
 */
class OpenAIProvider implements AIProvider {
  readonly model: string;
  constructor(model = process.env.AI_MODEL ?? "gpt-4o-mini") {
    this.model = model;
  }
  async generate(_req: AnalysisRequest): Promise<AnalysisResult> {
    throw new Error(
      "OpenAIProvider not yet enabled. Set AI_PROVIDER=mock for development, " +
        "or implement the API call in src/lib/ai/provider.ts for Phase 5.",
    );
  }
}

export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER ?? "mock";
  switch (provider) {
    case "openai":
      return new OpenAIProvider();
    case "mock":
    default:
      return new MockAIProvider();
  }
}
