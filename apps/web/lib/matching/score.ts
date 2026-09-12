import { computeSignals } from "./signals";
import {
  DIMENSION_WEIGHTS,
  GRADE_BOUNDARIES,
  SCORING_VERSION,
  type Grade,
  type MatchReason,
  type MatchResult,
  type ScorableOpportunity,
  type SignalOutcome,
  type WorkspaceProfile,
} from "./types";

/**
 * Turn a (workspace, opportunity) pair into a graded MatchResult.
 *
 * Short-circuits:
 *   - not_eligible if any excluded keyword hits title/description.
 *   - need_more_info if the workspace has zero capabilities +
 *     zero projects + zero sectors + zero countries + zero keywords.
 *
 * Otherwise: sum contributions across dimensions that are `applicable`,
 * normalize to 0-100 (redistribute weight across applicable dims), then
 * map to a grade via GRADE_BOUNDARIES.
 */
export function scoreOpportunity(
  ws: WorkspaceProfile,
  opp: ScorableOpportunity,
): MatchResult {
  const excluded = matchesExcluded(ws, opp);
  if (excluded) {
    return {
      score: 0,
      grade: "not_eligible",
      reasons: [],
      concerns: [
        {
          dimension: "keyword",
          contribution: 0,
          evidence: `Excluded by keyword: ${excluded}`,
        },
      ],
      scoringVersion: SCORING_VERSION,
    };
  }

  const emptyProfile =
    ws.capabilities.length === 0 &&
    ws.sectors.length === 0 &&
    ws.countries.length === 0 &&
    ws.keywords.length === 0 &&
    ws.projectTitles.length === 0;
  if (emptyProfile) {
    return {
      score: 0,
      grade: "need_more_info",
      reasons: [],
      concerns: [
        {
          dimension: "capability",
          contribution: 0,
          evidence: "Complete your workspace profile to see grades",
        },
      ],
      scoringVersion: SCORING_VERSION,
    };
  }

  const signals = computeSignals(ws, opp);
  const score = combineToScore(signals);
  const grade = gradeFor(score);
  const { reasons, concerns } = partitionReasons(signals);
  return { score, grade, reasons, concerns, scoringVersion: SCORING_VERSION };
}

function combineToScore(signals: SignalOutcome[]): number {
  const applicable = signals.filter((s) => s.applicable);
  if (applicable.length === 0) return 0;
  const applicableWeight = applicable.reduce(
    (sum, s) => sum + DIMENSION_WEIGHTS[s.dimension],
    0,
  );
  const rawScore = applicable.reduce((sum, s) => sum + s.contribution, 0);
  if (applicableWeight === 0) return 0;
  // Redistribute: rawScore / applicableWeight × 100.
  return Math.round((rawScore / applicableWeight) * 100);
}

function gradeFor(score: number): Grade {
  if (score >= GRADE_BOUNDARIES.A) return "A";
  if (score >= GRADE_BOUNDARIES.B) return "B";
  if (score >= GRADE_BOUNDARIES.C) return "C";
  return "D";
}

function partitionReasons(signals: SignalOutcome[]): {
  reasons: MatchReason[];
  concerns: MatchReason[];
} {
  const applicable = signals.filter((s) => s.applicable);
  const reasons = applicable
    .filter((s) => s.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3)
    .map(toReason);
  const concerns = applicable
    .filter((s) => s.contribution === 0)
    .slice(0, 2)
    .map(toReason);
  return { reasons, concerns };
}

function toReason(s: SignalOutcome): MatchReason {
  return {
    dimension: s.dimension,
    contribution: s.contribution,
    evidence: s.evidence,
  };
}

function matchesExcluded(
  ws: WorkspaceProfile,
  opp: ScorableOpportunity,
): string | null {
  if (ws.excludedKeywords.length === 0) return null;
  const haystack = `${opp.title} ${opp.description ?? ""}`;
  for (const k of ws.excludedKeywords) {
    const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escaped}\\b`, "i").test(haystack)) return k;
  }
  return null;
}
