import { describe, it, expect } from "vitest";
import { computeOverallScore, type CategoryScore } from "@/config/compatibility";

describe("computeOverallScore", () => {
  it("returns null when nothing is scored", () => {
    expect(computeOverallScore([])).toBeNull();
    expect(
      computeOverallScore([{ key: "faith_alignment", score: null }]),
    ).toBeNull();
  });

  it("computes a weighted average across scored categories", () => {
    const scores: CategoryScore[] = [
      { key: "faith_alignment", score: 100 }, // weight 1.5
      { key: "career_compatibility", score: 0 }, // weight 0.8
    ];
    // (100*1.5 + 0*0.8) / (1.5 + 0.8) = 150 / 2.3 ≈ 65.2
    expect(computeOverallScore(scores)).toBeCloseTo(65.2, 1);
  });

  it("lets an override supersede the computed score", () => {
    const scores: CategoryScore[] = [
      { key: "communication", score: 40, override: 90 },
    ];
    expect(computeOverallScore(scores)).toBe(90);
  });

  it("ignores unscored categories in the average", () => {
    const scores: CategoryScore[] = [
      { key: "faith_alignment", score: 80 },
      { key: "communication", score: null },
    ];
    expect(computeOverallScore(scores)).toBe(80);
  });
});
