import { describe, expect, it } from "vitest";
import { computeAssessment } from "./compute";
import type { WorkspaceSnapshot } from "./evaluate";

const emptySnapshot: WorkspaceSnapshot = {
  credentials: [],
  pastProjects: [],
  financials: null,
  workforce: null,
  countryCode: null,
};

describe("computeAssessment — pure pipeline", () => {
  it("extracts, evaluates, and scores in one call", () => {
    const text =
      "The bidder must hold a valid ISO 27001 certification and be registered in Bangladesh.";
    const result = computeAssessment(text, {
      ...emptySnapshot,
      countryCode: "BD",
      credentials: [
        {
          normalizedKey: "iso_27001",
          status: "valid",
          expiryDate: null,
          name: "ISO 27001",
        },
      ],
    });
    expect(result.requirements.length).toBeGreaterThanOrEqual(2);
    expect(result.evaluations.length).toBe(result.requirements.length);
    expect(result.score.eligibility).toBe("pass");
  });

  it("fails eligibility when a mandatory certification is missing", () => {
    const text = "The bidder must hold a valid ISO 27001 certification.";
    const result = computeAssessment(text, emptySnapshot);
    expect(result.score.eligibility).toBe("fail");
    expect(result.score.recommendation).toBe("skip");
  });

  it("returns not_evaluated when no requirements can be extracted", () => {
    const result = computeAssessment(
      "Weather today is nice. Nothing to see.",
      emptySnapshot,
    );
    expect(result.requirements.length).toBe(0);
    expect(result.score.eligibility).toBe("not_evaluated");
  });

  it("aligns requirements[i] with evaluations[i]", () => {
    const text = "Firm must have completed at least 3 similar projects.";
    const result = computeAssessment(text, {
      ...emptySnapshot,
      pastProjects: [{ title: "One", sector: "gov" }],
    });
    for (let i = 0; i < result.requirements.length; i++) {
      expect(result.evaluations[i]).toBeTruthy();
    }
  });

  it("reports basic extraction stats", () => {
    const text = "Must hold ISO 9001 and ISO 27001. Weather is nice.";
    const result = computeAssessment(text, emptySnapshot);
    expect(result.stats.sourceTextLen).toBe(text.length);
    expect(result.stats.ruleHits).toBeGreaterThan(0);
  });
});
