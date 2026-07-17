/**
 * ────────────────────────────────────────────────────────────────────────────
 *  Compatibility engine configuration (decision-support only).
 * ────────────────────────────────────────────────────────────────────────────
 *  These are placeholder scoring rules. The overall score (0–100) is a weighted
 *  average of per-category scores (0–100). Scores are ADMIN-FACING ONLY and are
 *  never shown to applicants.
 *
 *  IMPORTANT: This score does not, and cannot, determine character, honesty,
 *  abuse risk, or the future success of a relationship. It is decision-support
 *  for a human reviewer who remains the sole decision-maker.
 */

export interface CompatibilityCategory {
  key: string;
  label: string;
  /** Relative weight; the engine normalizes weights so they need not sum to 1. */
  weight: number;
  description: string;
}

export const compatibilityCategories: CompatibilityCategory[] = [
  { key: "faith_alignment", label: "Faith Alignment", weight: 1.5, description: "Shared spiritual foundation and expectations." },
  { key: "relationship_readiness", label: "Relationship Readiness", weight: 1.5, description: "Availability, intentionality, and timing." },
  { key: "emotional_maturity", label: "Emotional Maturity", weight: 1.3, description: "Self-awareness, regulation, accountability." },
  { key: "communication", label: "Communication", weight: 1.2, description: "Clarity, honesty, repair after conflict." },
  { key: "family_vision", label: "Family Vision", weight: 1.2, description: "Alignment on family and home." },
  { key: "financial_responsibility", label: "Financial Responsibility", weight: 1.0, description: "Stewardship and stability." },
  { key: "career_compatibility", label: "Career Compatibility", weight: 0.8, description: "Ambition, schedule, and support." },
  { key: "lifestyle_compatibility", label: "Lifestyle Compatibility", weight: 0.8, description: "Habits, pace, and daily rhythms." },
  { key: "leadership_partnership", label: "Leadership & Partnership", weight: 1.0, description: "Shared decision-making and responsibility." },
  { key: "conflict_resolution", label: "Conflict Resolution", weight: 1.1, description: "Handling disagreement and repair." },
  { key: "geographic_compatibility", label: "Geographic Compatibility", weight: 0.7, description: "Location and relocation flexibility." },
  { key: "long_term_vision", label: "Long-Term Vision", weight: 1.2, description: "Marriage, legacy, and shared future." },
];

/** A single category's assessment result. */
export interface CategoryScore {
  key: string;
  /** 0–100. `null` means not yet scored. */
  score: number | null;
  /** Optional admin override that supersedes the computed score. */
  override?: number | null;
  notes?: string;
}

/**
 * Compute a normalized overall score (0–100) from per-category scores.
 * Override takes precedence over score. Categories with no score/override are
 * excluded from the weighted average (so a partial assessment still yields a
 * meaningful number over the completed categories).
 */
export function computeOverallScore(scores: CategoryScore[]): number | null {
  const weightByKey = new Map(compatibilityCategories.map((c) => [c.key, c.weight]));

  let weightedSum = 0;
  let weightTotal = 0;

  for (const s of scores) {
    const effective = s.override ?? s.score;
    if (effective === null || effective === undefined) continue;
    const weight = weightByKey.get(s.key) ?? 1;
    weightedSum += effective * weight;
    weightTotal += weight;
  }

  if (weightTotal === 0) return null;
  return Math.round((weightedSum / weightTotal) * 10) / 10;
}

export const COMPATIBILITY_DISCLAIMER =
  "Compatibility scores are decision-support only. They do not determine character, honesty, safety, or the outcome of a relationship. A human reviewer makes all decisions.";
