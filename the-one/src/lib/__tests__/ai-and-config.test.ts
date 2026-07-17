import { describe, it, expect } from "vitest";
import { getAIProvider } from "@/lib/ai/provider";
import { aiPrompts, aiKinds } from "@/config/ai-prompts";
import { applicationSteps, consentItems } from "@/config/application-schema";
import { compatibilityCategories } from "@/config/compatibility";
import { APPLICANT_STATUSES, APPLICANT_STATUS_LABELS } from "@/config/site";

describe("AI provider (mock)", () => {
  it("returns decision-support output with model + prompt metadata", async () => {
    const provider = getAIProvider();
    const res = await provider.generate({
      kind: "summary",
      applicantContext: { answers: { why_now: "I'm ready." } },
      promptName: "applicant_summary",
      promptVersion: "1.0.0",
    });
    expect(res.model).toBeTruthy();
    expect(res.promptName).toBe("applicant_summary");
    expect(res.promptVersion).toBe("1.0.0");
    expect(res.content.text.toLowerCase()).toContain("decision-support");
    expect(typeof res.generatedAt).toBe("string");
  });

  it("returns items for follow-up questions", async () => {
    const res = await getAIProvider().generate({
      kind: "follow_up_questions",
      applicantContext: {},
      promptName: "follow_ups",
      promptVersion: "1.0.0",
    });
    expect(Array.isArray(res.content.items)).toBe(true);
  });
});

describe("AI prompt registry", () => {
  it("defines a versioned prompt for every analysis kind", () => {
    for (const kind of aiKinds) {
      const p = aiPrompts[kind];
      expect(p.name).toBeTruthy();
      expect(p.version).toMatch(/^\d+\.\d+\.\d+$/);
      // Guardrails present in every template.
      expect(p.template.toLowerCase()).toContain("do not");
    }
  });
});

describe("application schema integrity", () => {
  it("has 12 steps with unique keys and sequential indexes", () => {
    expect(applicationSteps).toHaveLength(12);
    const keys = new Set(applicationSteps.map((s) => s.key));
    expect(keys.size).toBe(12);
    applicationSteps.forEach((s, i) => expect(s.index).toBe(i + 1));
  });

  it("has globally unique field keys", () => {
    const keys = applicationSteps.flatMap((s) => s.fields.map((f) => f.key));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("requires all consent certifications", () => {
    expect(consentItems.length).toBeGreaterThanOrEqual(11);
  });
});

describe("config coverage", () => {
  it("labels every applicant status", () => {
    for (const s of APPLICANT_STATUSES) {
      expect(APPLICANT_STATUS_LABELS[s]).toBeTruthy();
    }
  });

  it("defines 12 compatibility categories with positive weights", () => {
    expect(compatibilityCategories).toHaveLength(12);
    for (const c of compatibilityCategories) expect(c.weight).toBeGreaterThan(0);
  });
});
