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
  /** System instructions (guardrails + task). Falls back to a safe default. */
  systemPrompt?: string;
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
 * OpenAI provider — real Chat Completions call. Requests a JSON object so the
 * result maps cleanly onto `{ text, items }`. The base URL is overridable
 * (`OPENAI_BASE_URL`) so any OpenAI-compatible endpoint can be used.
 */
class OpenAIProvider implements AIProvider {
  readonly model: string;
  private readonly baseUrl: string;

  constructor(model = process.env.AI_MODEL ?? "gpt-4o-mini") {
    this.model = model;
    this.baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  }

  async generate(req: AnalysisRequest): Promise<AnalysisResult> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY is not configured.");

    const system = req.systemPrompt ?? DECISION_SUPPORT_NOTE;
    const user =
      "Base your response ONLY on the applicant's own words below.\n" +
      `Applicant context:\n${JSON.stringify(req.applicantContext, null, 2)}\n\n` +
      'Respond as a JSON object: {"text": string, "items"?: string[]}. ' +
      "Use `items` for lists (questions, topics, bullet points); otherwise omit it.";

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`OpenAI error ${res.status}: ${detail.slice(0, 300)}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    let parsed: { text?: unknown; items?: unknown };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { text: raw };
    }

    return {
      kind: req.kind,
      content: {
        text: typeof parsed.text === "string" ? parsed.text : String(parsed.text ?? ""),
        items: Array.isArray(parsed.items) ? parsed.items.map((x) => String(x)) : undefined,
      },
      model: this.model,
      promptName: req.promptName,
      promptVersion: req.promptVersion,
      generatedAt: new Date().toISOString(),
    };
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
