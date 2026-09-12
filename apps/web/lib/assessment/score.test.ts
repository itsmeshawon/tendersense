import { describe, expect, it } from "vitest";
import { scoreAssessment, type EvaluatedRequirement } from "./score";
import type { EvaluationStatus, RequirementCategory } from "./types";

function er(
  category: RequirementCategory,
  status: EvaluationStatus,
  mandatory = true,
): EvaluatedRequirement {
  return {
    requirement: {
      category,
      text: "x",
      mandatory,
      confidence: 0.9,
      patternId: "test",
    },
    evaluation: { status, reasoning: "r", evidenceRefs: [] },
  };
}

describe("scoreAssessment — overall eligibility state", () => {
  it("returns not_evaluated for zero requirements", () => {
    const s = scoreAssessment([]);
    expect(s.eligibility).toBe("not_evaluated");
    expect(s.eligibility_score).toBe(0);
  });

  it("pass when all mandatory meet", () => {
    const s = scoreAssessment([
      er("certification", "meets"),
      er("financial", "meets"),
    ]);
    expect(s.eligibility).toBe("pass");
    expect(s.eligibility_score).toBe(100);
  });

  it("fail when any mandatory has a gap", () => {
    const s = scoreAssessment([
      er("certification", "meets"),
      er("financial", "gap"),
    ]);
    expect(s.eligibility).toBe("fail");
    expect(s.recommendation).toBe("skip");
    expect(s.recommendation_reason).toBe("likely_decline");
  });

  it("optional gap does not fail overall", () => {
    const s = scoreAssessment([
      er("certification", "meets"),
      er("financial", "gap", false),
    ]);
    expect(s.eligibility).not.toBe("fail");
  });

  it("partial when a mandatory is partially_meets", () => {
    const s = scoreAssessment([
      er("certification", "meets"),
      er("experience", "partially_meets"),
    ]);
    expect(s.eligibility).toBe("partial");
  });

  it("needs_verification when a mandatory needs verification (no gap)", () => {
    const s = scoreAssessment([
      er("certification", "meets"),
      er("financial", "needs_verification"),
    ]);
    expect(s.eligibility).toBe("needs_verification");
    expect(s.recommendation).toBe("verify");
    expect(s.recommendation_reason).toBe("needs_review");
  });

  it("not_applicable is ignored in the state decision", () => {
    const s = scoreAssessment([
      er("submission", "not_applicable"),
      er("certification", "meets"),
    ]);
    expect(s.eligibility).toBe("pass");
  });
});

describe("scoreAssessment — recommendation mapping", () => {
  it("strong_pursue → BID for high-scoring pass", () => {
    const s = scoreAssessment([
      er("certification", "meets"),
      er("financial", "meets"),
      er("experience", "meets"),
    ]);
    expect(s.recommendation_reason).toBe("strong_pursue");
    expect(s.recommendation).toBe("bid");
  });
});

describe("scoreAssessment — category scores", () => {
  it("produces per-category numeric scores keyed by SoT §21 categories", () => {
    const s = scoreAssessment([
      er("certification", "meets"),
      er("financial", "gap"),
    ]);
    expect(s.category_scores["certification"]).toBe(100);
    expect(s.category_scores["financial"]).toBe(0);
  });

  it("omits categories with only not_applicable requirements", () => {
    const s = scoreAssessment([
      er("submission", "not_applicable"),
      er("certification", "meets"),
    ]);
    expect(s.category_scores["submission"]).toBeUndefined();
    expect(s.category_scores["certification"]).toBe(100);
  });
});

describe("scoreAssessment — score bounds", () => {
  it("eligibility_score is an integer in [0, 100]", () => {
    const s = scoreAssessment([
      er("certification", "meets"),
      er("financial", "partially_meets"),
      er("experience", "needs_verification"),
    ]);
    expect(Number.isInteger(s.eligibility_score)).toBe(true);
    expect(s.eligibility_score).toBeGreaterThanOrEqual(0);
    expect(s.eligibility_score).toBeLessThanOrEqual(100);
  });
});
