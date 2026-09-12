/**
 * Aggregates per-requirement evaluations into an assessment-level
 * eligibility state, numeric score, and recommendation. SoT §22-24.
 *
 * Mandatory-gap dominance: one mandatory `gap` → `fail`. The score
 * still reflects the wider requirement mix, but the recommendation
 * flips to `skip` (`likely_decline`).
 */
import type {
  EvaluationStatus,
  ExtractedRequirement,
  RequirementCategory,
} from "./types";
import type { RequirementEvaluation } from "./evaluate";

export interface EvaluatedRequirement {
  requirement: ExtractedRequirement;
  evaluation: RequirementEvaluation;
}

export type EligibilityState =
  | "pass"
  | "partial"
  | "needs_verification"
  | "fail"
  | "not_evaluated";

export type Recommendation = "bid" | "verify" | "hold" | "skip";
export type RecommendationReason =
  | "strong_pursue"
  | "potential_pursue"
  | "needs_review"
  | "high_risk"
  | "likely_decline";

export interface AssessmentScore {
  eligibility: EligibilityState;
  eligibility_score: number;
  recommendation: Recommendation;
  recommendation_reason: RecommendationReason;
  category_scores: Partial<Record<RequirementCategory, number>>;
}

const STATUS_POINTS: Record<EvaluationStatus, number | null> = {
  meets: 100,
  partially_meets: 60,
  needs_verification: 50,
  gap: 0,
  not_applicable: null,
};

const REASON_TO_DISPLAY: Record<RecommendationReason, Recommendation> = {
  strong_pursue: "bid",
  potential_pursue: "bid",
  needs_review: "verify",
  high_risk: "hold",
  likely_decline: "skip",
};

function deriveState(mandatoryStatuses: EvaluationStatus[]): EligibilityState {
  if (mandatoryStatuses.length === 0) return "not_evaluated";
  if (mandatoryStatuses.includes("gap")) return "fail";
  if (mandatoryStatuses.includes("partially_meets")) return "partial";
  if (mandatoryStatuses.includes("needs_verification"))
    return "needs_verification";
  return "pass";
}

function deriveReason(
  state: EligibilityState,
  score: number,
): RecommendationReason {
  switch (state) {
    case "fail":
      return "likely_decline";
    case "partial":
      return score < 60 ? "high_risk" : "potential_pursue";
    case "needs_verification":
      return "needs_review";
    case "pass":
      return score >= 85 ? "strong_pursue" : "potential_pursue";
    case "not_evaluated":
      return "needs_review";
  }
}

export function scoreAssessment(
  evaluated: EvaluatedRequirement[],
): AssessmentScore {
  const applicable = evaluated.filter(
    (e) => e.evaluation.status !== "not_applicable",
  );

  const mandatoryStatuses = applicable
    .filter((e) => e.requirement.mandatory)
    .map((e) => e.evaluation.status);

  const state = deriveState(mandatoryStatuses);

  const byCategory = new Map<RequirementCategory, number[]>();
  for (const { requirement, evaluation } of applicable) {
    const points = STATUS_POINTS[evaluation.status];
    if (points === null) continue;
    const arr = byCategory.get(requirement.category) ?? [];
    arr.push(points);
    byCategory.set(requirement.category, arr);
  }

  const category_scores: Partial<Record<RequirementCategory, number>> = {};
  for (const [cat, scores] of byCategory) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    category_scores[cat] = Math.round(avg);
  }

  const overallScores = Array.from(byCategory.values()).map(
    (s) => s.reduce((a, b) => a + b, 0) / s.length,
  );
  const rawScore =
    overallScores.length === 0
      ? 0
      : overallScores.reduce((a, b) => a + b, 0) / overallScores.length;
  const eligibility_score =
    state === "not_evaluated" ? 0 : Math.round(rawScore);

  const reason = deriveReason(state, eligibility_score);
  const recommendation = REASON_TO_DISPLAY[reason];

  return {
    eligibility: state,
    eligibility_score,
    recommendation,
    recommendation_reason: reason,
    category_scores,
  };
}
