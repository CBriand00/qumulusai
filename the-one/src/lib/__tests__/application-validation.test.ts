import { describe, it, expect } from "vitest";
import { validateField, validateStep, completionPercent } from "@/lib/validation/application";
import { applicationSteps } from "@/config/application-schema";
import { platformRules } from "@/config/site";

const dobField = { key: "date_of_birth", label: "DOB", type: "date" as const, required: true, profileColumn: "date_of_birth" };

describe("validateField", () => {
  it("requires required fields", () => {
    expect(validateField({ key: "x", label: "X", type: "text", required: true }, "")).toBeTruthy();
    expect(validateField({ key: "x", label: "X", type: "text", required: true }, "ok")).toBeNull();
  });

  it("validates URLs", () => {
    const f = { key: "u", label: "U", type: "url" as const };
    expect(validateField(f, "not-a-url")).toBeTruthy();
    expect(validateField(f, "https://example.com")).toBeNull();
  });

  it("enforces the minimum age on DOB", () => {
    const tooYoung = new Date();
    tooYoung.setFullYear(tooYoung.getFullYear() - (platformRules.minimumAge - 2));
    expect(validateField(dobField, tooYoung.toISOString().slice(0, 10))).toContain("at least");

    const oldEnough = new Date();
    oldEnough.setFullYear(oldEnough.getFullYear() - (platformRules.minimumAge + 5));
    expect(validateField(dobField, oldEnough.toISOString().slice(0, 10))).toBeNull();
  });

  it("validates a 1-5 scale", () => {
    const f = { key: "s", label: "S", type: "scale" as const };
    expect(validateField(f, 0)).toBeTruthy();
    expect(validateField(f, 6)).toBeTruthy();
    expect(validateField(f, 3)).toBeNull();
  });
});

describe("validateStep", () => {
  it("flags missing required fields on step 1", () => {
    const errors = validateStep(1, {});
    expect(errors["legal_first_name"]).toBeTruthy();
    expect(errors["age_confirm"]).toBeTruthy();
  });
});

describe("completionPercent", () => {
  it("is 0 with no values and 100 when all required filled", () => {
    expect(completionPercent({})).toBe(0);
    const all: Record<string, string | boolean> = {};
    for (const step of applicationSteps) {
      for (const f of step.fields) {
        if (f.required) all[f.key] = f.type === "boolean" ? true : "value";
      }
    }
    expect(completionPercent(all)).toBe(100);
  });
});
