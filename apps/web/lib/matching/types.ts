/**
 * Public types for the matching engine.
 *
 * ADR 0006 §5: grade vocabulary is fixed. ADR 0006 §6: boundaries are
 * hardcoded, not user-configurable.
 * Phase 3 plan v2 §2: 5-dimension scoring model (trimmed from SoT §19.2's
 * original 9 — see §2a for the deferred signals).
 */

export type Grade = "A" | "B" | "C" | "D" | "not_eligible" | "need_more_info";

/** Grade boundary constants — Phase 3 plan v2 §2. */
export const GRADE_BOUNDARIES = {
  A: 85, // Strong fit
  B: 70, // Good fit
  C: 50, // Possible
  D: 0, // Weak fit
} as const;

/**
 * The five in-scope scoring dimensions. Weight sum = 100.
 * Deferred (Phase 3 §2a): credential (5, Phase 4), source-preference (5),
 * method-preference (5), timeline (5, stays as sort-only).
 */
export type Dimension =
  | "capability"
  | "sector"
  | "keyword"
  | "past_project"
  | "country";

export const DIMENSION_WEIGHTS: Record<Dimension, number> = {
  capability: 35,
  sector: 20,
  keyword: 20,
  past_project: 15,
  country: 10,
} as const;

/** Current scoring version. Bump when weights or logic change materially. */
export const SCORING_VERSION = 1;

/** One dimension's output: matched score contribution + evidence for the popover. */
export interface SignalOutcome {
  dimension: Dimension;
  /** Weight × normalized-match (0..1). Redistributed to full weight if input data present. */
  contribution: number;
  /**
   * If the dimension's inputs are missing on both sides, treat as N/A and
   * redistribute — do not silently zero (Phase 3 §2 "ambiguity" rule).
   */
  applicable: boolean;
  evidence: string;
}

/** Final match verdict for a (workspace, opportunity) pair. */
export interface MatchResult {
  score: number; // 0..100 integer
  grade: Grade;
  reasons: MatchReason[]; // top positive contributors
  concerns: MatchReason[]; // top negative contributors (missing signals)
  scoringVersion: number;
}

export interface MatchReason {
  dimension: Dimension;
  contribution: number;
  evidence: string;
}

/**
 * Minimum shape of an opportunity needed to score it.
 */
export interface ScorableOpportunity {
  id: string;
  source_key: string;
  country_code: string | null;
  sector: string[] | null;
  title: string;
  description: string | null;
}

/**
 * Minimum shape of a workspace's matching profile.
 */
export interface WorkspaceProfile {
  workspaceId: string;
  capabilities: string[];
  sectors: string[];
  countries: string[]; // countries the workspace operates in
  keywords: string[];
  excludedKeywords: string[];
  /** Titles of past projects — used for the past_project similarity signal. */
  projectTitles: string[];
}
