/**
 * Pure assessment pipeline: text + snapshot → structured verdict.
 *
 * Kept side-effect-free so it can be unit-tested exhaustively; the
 * I/O (loading snapshots, writing rows) lives in ./run.ts.
 */
import { extractRequirements } from "./rulesExtractor";
import { evaluateRequirement, type WorkspaceSnapshot } from "./evaluate";
import { scoreAssessment } from "./score";
import type { ExtractedRequirement } from "./types";
import type { RequirementEvaluation } from "./evaluate";
import type { AssessmentScore } from "./score";

export interface ComputedAssessment {
  requirements: ExtractedRequirement[];
  evaluations: RequirementEvaluation[];
  score: AssessmentScore;
  stats: {
    sourceTextLen: number;
    ruleHits: number;
  };
}

export function computeAssessment(
  sourceText: string,
  snapshot: WorkspaceSnapshot,
): ComputedAssessment {
  const requirements = extractRequirements(sourceText);
  const evaluations = requirements.map((r) => evaluateRequirement(r, snapshot));
  const evaluated = requirements.map((requirement, i) => ({
    requirement,
    evaluation: evaluations[i],
  }));
  const score = scoreAssessment(evaluated);
  return {
    requirements,
    evaluations,
    score,
    stats: {
      sourceTextLen: sourceText.length,
      ruleHits: requirements.length,
    },
  };
}
