import {
  DIMENSION_WEIGHTS,
  type ScorableOpportunity,
  type SignalOutcome,
  type WorkspaceProfile,
} from "./types";
import { CAPABILITY_TAXONOMY } from "./taxonomy";
import { extractRequirements } from "@/lib/assessment/rulesExtractor";

/**
 * Pure per-dimension signal functions. Each returns
 * `{ dimension, contribution, applicable, evidence }`.
 *
 * Contribution is in points (0..weight). `applicable=false` means the
 * inputs were missing on the workspace or opportunity side; the score
 * combiner will redistribute weight across applicable dimensions
 * (Phase 3 §2 "ambiguity" rule).
 */
export function computeSignals(
  ws: WorkspaceProfile,
  opp: ScorableOpportunity,
): SignalOutcome[] {
  return [
    capabilitySignal(ws, opp),
    sectorSignal(ws, opp),
    keywordSignal(ws, opp),
    pastProjectSignal(ws, opp),
    countrySignal(ws, opp),
    credentialSignal(ws, opp),
  ];
}

// -------------------------------------------------------------------
// Credential — 7 points. Runs the assessment rules extractor over the
// opportunity text to identify required certifications, then checks
// whether the workspace holds ≥1 matching valid credential. Phase 4
// §2h restored this signal after Phase 3 deferred it.
// -------------------------------------------------------------------
function credentialSignal(
  ws: WorkspaceProfile,
  opp: ScorableOpportunity,
): SignalOutcome {
  const weight = DIMENSION_WEIGHTS.credential;
  const required = extractRequirements(`${opp.title}. ${opp.description ?? ""}`)
    .filter((r) => r.category === "certification" && r.normalizedKey)
    .map((r) => r.normalizedKey!);
  if (required.length === 0) {
    return applicableFalse(
      "credential",
      "Opportunity lists no specific certifications — inapplicable",
    );
  }
  if (ws.credentialKeys.length === 0) {
    return {
      dimension: "credential",
      contribution: 0,
      applicable: true,
      evidence: `Opportunity asks for ${required.join(", ")}; workspace has no credentials on file`,
    };
  }
  const overlap = required.filter((k) => ws.credentialKeys.includes(k));
  if (overlap.length === 0) {
    return {
      dimension: "credential",
      contribution: 0,
      applicable: true,
      evidence: `Missing required credentials: ${required.join(", ")}`,
    };
  }
  return {
    dimension: "credential",
    contribution: weight,
    applicable: true,
    evidence: `Credential match: ${overlap.join(", ")}`,
  };
}

// -------------------------------------------------------------------
// Capability — 35 points. Full contribution if any of the workspace's
// capabilities has ≥ 1 signal-word hit in title+description.
// -------------------------------------------------------------------
function capabilitySignal(
  ws: WorkspaceProfile,
  opp: ScorableOpportunity,
): SignalOutcome {
  const weight = DIMENSION_WEIGHTS.capability;
  if (ws.capabilities.length === 0) {
    return applicableFalse("capability", "Workspace has no declared capabilities");
  }
  const haystack = `${opp.title} ${opp.description ?? ""}`;
  const hits: string[] = [];
  for (const capKey of ws.capabilities) {
    const cap = CAPABILITY_TAXONOMY.find((c) => c.key === capKey);
    if (!cap) continue;
    const capHits = cap.signalWords.filter((w) => containsWord(haystack, w));
    if (capHits.length > 0) hits.push(`${cap.label} (${capHits.join(", ")})`);
  }
  if (hits.length === 0) {
    return {
      dimension: "capability",
      contribution: 0,
      applicable: true,
      evidence: `No capability hits in title/description`,
    };
  }
  // Full contribution for the first hit; +0 for redundant hits.
  return {
    dimension: "capability",
    contribution: weight,
    applicable: true,
    evidence: `Capability match: ${hits.join("; ")}`,
  };
}

// -------------------------------------------------------------------
// Sector — 20 points. Full contribution on overlap; 0 if disjoint;
// inapplicable if opportunity has no sector data.
// -------------------------------------------------------------------
function sectorSignal(
  ws: WorkspaceProfile,
  opp: ScorableOpportunity,
): SignalOutcome {
  const weight = DIMENSION_WEIGHTS.sector;
  if (ws.sectors.length === 0) {
    return applicableFalse("sector", "Workspace has no declared sectors");
  }
  const oppSectors = opp.sector ?? [];
  if (oppSectors.length === 0) {
    return applicableFalse(
      "sector",
      "Opportunity has no sector data — inapplicable",
    );
  }
  const overlap = ws.sectors.filter((s) => oppSectors.includes(s));
  if (overlap.length > 0) {
    return {
      dimension: "sector",
      contribution: weight,
      applicable: true,
      evidence: `Sector match: ${overlap.join(", ")}`,
    };
  }
  return {
    dimension: "sector",
    contribution: 0,
    applicable: true,
    evidence: `Sectors don't overlap (workspace: ${ws.sectors.join(", ")}; opp: ${oppSectors.join(", ")})`,
  };
}

// -------------------------------------------------------------------
// Keyword — 20 points. Proportional to fraction of workspace keywords
// that hit the opportunity text (word-boundary aware). Excluded
// keywords are handled elsewhere (not_eligible short-circuit).
// -------------------------------------------------------------------
function keywordSignal(
  ws: WorkspaceProfile,
  opp: ScorableOpportunity,
): SignalOutcome {
  const weight = DIMENSION_WEIGHTS.keyword;
  if (ws.keywords.length === 0) {
    return applicableFalse("keyword", "Workspace has no keywords");
  }
  const haystack = `${opp.title} ${opp.description ?? ""}`;
  const hits = ws.keywords.filter((k) => containsWord(haystack, k));
  const fraction = hits.length / ws.keywords.length;
  return {
    dimension: "keyword",
    contribution: Math.round(weight * fraction),
    applicable: true,
    evidence:
      hits.length > 0
        ? `Keyword hits: ${hits.join(", ")} (${hits.length}/${ws.keywords.length})`
        : "No keyword hits",
  };
}

// -------------------------------------------------------------------
// Past project — 15 points. Cheap similarity: any non-trivial word
// shared between opportunity title and a past project title.
// -------------------------------------------------------------------
function pastProjectSignal(
  ws: WorkspaceProfile,
  opp: ScorableOpportunity,
): SignalOutcome {
  const weight = DIMENSION_WEIGHTS.past_project;
  if (ws.projectTitles.length === 0) {
    return applicableFalse(
      "past_project",
      "Workspace has no past projects to compare",
    );
  }
  const oppTokens = tokenize(opp.title);
  if (oppTokens.length === 0) {
    return {
      dimension: "past_project",
      contribution: 0,
      applicable: true,
      evidence: "Opportunity title has no useful tokens",
    };
  }
  const bestMatch = ws.projectTitles.reduce<{
    title: string;
    overlap: number;
  }>(
    (best, title) => {
      const projTokens = new Set(tokenize(title));
      const overlap = oppTokens.filter((t) => projTokens.has(t)).length;
      return overlap > best.overlap ? { title, overlap } : best;
    },
    { title: "", overlap: 0 },
  );
  if (bestMatch.overlap === 0) {
    return {
      dimension: "past_project",
      contribution: 0,
      applicable: true,
      evidence: "No past-project token overlap",
    };
  }
  // Scale: 1 token hit = ~half, 2+ = full
  const fraction = Math.min(1, bestMatch.overlap / 2);
  return {
    dimension: "past_project",
    contribution: Math.round(weight * fraction),
    applicable: true,
    evidence: `Similar to past project: "${bestMatch.title}" (${bestMatch.overlap} shared tokens)`,
  };
}

// -------------------------------------------------------------------
// Country — 10 points. Full contribution if opportunity country is in
// the workspace's declared countries; 0 otherwise; inapplicable if
// workspace hasn't declared any.
// -------------------------------------------------------------------
function countrySignal(
  ws: WorkspaceProfile,
  opp: ScorableOpportunity,
): SignalOutcome {
  const weight = DIMENSION_WEIGHTS.country;
  if (ws.countries.length === 0) {
    return applicableFalse("country", "Workspace has no declared countries");
  }
  if (!opp.country_code) {
    return applicableFalse(
      "country",
      "Opportunity has no country_code — inapplicable",
    );
  }
  if (ws.countries.includes(opp.country_code)) {
    return {
      dimension: "country",
      contribution: weight,
      applicable: true,
      evidence: `Country match: ${opp.country_code}`,
    };
  }
  return {
    dimension: "country",
    contribution: 0,
    applicable: true,
    evidence: `Opportunity in ${opp.country_code}, workspace covers ${ws.countries.join(", ")}`,
  };
}

// -------------------------------------------------------------------

function applicableFalse(
  dim: SignalOutcome["dimension"],
  evidence: string,
): SignalOutcome {
  return { dimension: dim, contribution: 0, applicable: false, evidence };
}

const STOP_WORDS = new Set([
  "the",
  "for",
  "and",
  "of",
  "to",
  "in",
  "on",
  "at",
  "a",
  "an",
  "with",
  "by",
  "from",
]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 4 && !STOP_WORDS.has(t));
}

function containsWord(haystack: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(haystack);
}
