/**
 * Public types for the assessment engine.
 *
 * SoT §21 (requirement categories) + §22 (5-status evaluation) + Phase
 * 4 plan v2 §3. Kept in one file so importers can pull types + values
 * from a single entry point.
 */

/** 11 categories per SoT §21. */
export type RequirementCategory =
  | "legal"
  | "financial"
  | "technical"
  | "experience"
  | "personnel"
  | "certification"
  | "geography"
  | "documentation"
  | "submission"
  | "security"
  | "other";

export const REQUIREMENT_CATEGORIES: readonly RequirementCategory[] = [
  "legal",
  "financial",
  "technical",
  "experience",
  "personnel",
  "certification",
  "geography",
  "documentation",
  "submission",
  "security",
  "other",
];

/** SoT §22 5-status set. */
export type EvaluationStatus =
  | "meets"
  | "partially_meets"
  | "needs_verification"
  | "gap"
  | "not_applicable";

/** Threshold parsed out of a matched requirement (e.g. "≥ 3 projects"). */
export interface RequirementThreshold {
  operator: "gte" | "lte" | "eq" | "gt" | "lt";
  value: number;
  unit?: string;
}

/** Structured requirement produced by the extractor. */
export interface ExtractedRequirement {
  category: RequirementCategory;
  text: string;
  normalizedKey?: string;
  mandatory: boolean;
  threshold?: RequirementThreshold;
  sourceLocation?: string;
  confidence: number; // 0..1
  /** Which pattern produced this — for calibration/debug. */
  patternId: string;
}
