import { describe, expect, it } from "vitest";
import { evaluateRequirement, type WorkspaceSnapshot } from "./evaluate";
import type { ExtractedRequirement } from "./types";

const emptySnapshot: WorkspaceSnapshot = {
  credentials: [],
  pastProjects: [],
  financials: null,
  workforce: null,
  countryCode: null,
};

function req(over: Partial<ExtractedRequirement>): ExtractedRequirement {
  return {
    category: "other",
    text: "",
    mandatory: true,
    confidence: 0.9,
    patternId: "test",
    ...over,
  };
}

describe("evaluateRequirement — certifications", () => {
  it("meets when a matching valid credential exists", () => {
    const r = evaluateRequirement(
      req({ category: "certification", normalizedKey: "iso_27001" }),
      {
        ...emptySnapshot,
        credentials: [
          {
            normalizedKey: "iso_27001",
            status: "valid",
            expiryDate: null,
            name: "ISO 27001",
          },
        ],
      },
    );
    expect(r.status).toBe("meets");
    expect(r.evidenceRefs.length).toBe(1);
  });

  it("gaps when no credential exists at all", () => {
    const r = evaluateRequirement(
      req({ category: "certification", normalizedKey: "iso_27001" }),
      emptySnapshot,
    );
    expect(r.status).toBe("gap");
  });

  it("needs_verification when a credential of the same key is expired", () => {
    const r = evaluateRequirement(
      req({ category: "certification", normalizedKey: "iso_27001" }),
      {
        ...emptySnapshot,
        credentials: [
          {
            normalizedKey: "iso_27001",
            status: "expired",
            expiryDate: "2024-01-01",
            name: "ISO 27001",
          },
        ],
      },
    );
    expect(r.status).toBe("needs_verification");
  });
});

describe("evaluateRequirement — similar projects", () => {
  it("meets when project count >= threshold", () => {
    const r = evaluateRequirement(
      req({
        category: "experience",
        normalizedKey: "min_similar_projects",
        threshold: { operator: "gte", value: 3, unit: "projects" },
      }),
      {
        ...emptySnapshot,
        pastProjects: [
          { title: "A", sector: "gov" },
          { title: "B", sector: "gov" },
          { title: "C", sector: "gov" },
        ],
      },
    );
    expect(r.status).toBe("meets");
  });

  it("partially_meets when short of threshold but non-zero", () => {
    const r = evaluateRequirement(
      req({
        category: "experience",
        normalizedKey: "min_similar_projects",
        threshold: { operator: "gte", value: 3, unit: "projects" },
      }),
      { ...emptySnapshot, pastProjects: [{ title: "A", sector: "gov" }] },
    );
    expect(r.status).toBe("partially_meets");
  });

  it("gaps when zero projects", () => {
    const r = evaluateRequirement(
      req({
        category: "experience",
        normalizedKey: "min_similar_projects",
        threshold: { operator: "gte", value: 3, unit: "projects" },
      }),
      emptySnapshot,
    );
    expect(r.status).toBe("gap");
  });
});

describe("evaluateRequirement — annual turnover", () => {
  it("meets when reported turnover clears the threshold", () => {
    const r = evaluateRequirement(
      req({
        category: "financial",
        normalizedKey: "min_annual_turnover",
        threshold: { operator: "gte", value: 500_000_000, unit: "money" },
      }),
      {
        ...emptySnapshot,
        financials: { annualRevenue: 600_000_000, hasAudited: true },
      },
    );
    expect(r.status).toBe("meets");
  });

  it("gaps when reported turnover is below the threshold", () => {
    const r = evaluateRequirement(
      req({
        category: "financial",
        normalizedKey: "min_annual_turnover",
        threshold: { operator: "gte", value: 500_000_000, unit: "money" },
      }),
      {
        ...emptySnapshot,
        financials: { annualRevenue: 100_000_000, hasAudited: true },
      },
    );
    expect(r.status).toBe("gap");
  });

  it("needs_verification when financials are not filled in", () => {
    const r = evaluateRequirement(
      req({
        category: "financial",
        normalizedKey: "min_annual_turnover",
        threshold: { operator: "gte", value: 500_000_000, unit: "money" },
      }),
      emptySnapshot,
    );
    expect(r.status).toBe("needs_verification");
  });
});

describe("evaluateRequirement — audited financials", () => {
  it("meets when hasAudited=true", () => {
    const r = evaluateRequirement(
      req({ category: "financial", normalizedKey: "audited_financials" }),
      {
        ...emptySnapshot,
        financials: { annualRevenue: 0, hasAudited: true },
      },
    );
    expect(r.status).toBe("meets");
  });

  it("needs_verification when financials unset", () => {
    const r = evaluateRequirement(
      req({ category: "financial", normalizedKey: "audited_financials" }),
      emptySnapshot,
    );
    expect(r.status).toBe("needs_verification");
  });
});

describe("evaluateRequirement — geography", () => {
  it("meets when workspace country matches", () => {
    const r = evaluateRequirement(
      req({ category: "geography", normalizedKey: "country_bangladesh" }),
      { ...emptySnapshot, countryCode: "BD" },
    );
    expect(r.status).toBe("meets");
  });

  it("gaps when workspace country mismatches", () => {
    const r = evaluateRequirement(
      req({ category: "geography", normalizedKey: "country_bangladesh" }),
      { ...emptySnapshot, countryCode: "IN" },
    );
    expect(r.status).toBe("gap");
  });
});

describe("evaluateRequirement — behavior", () => {
  it("returns not_applicable for submission-mechanics keys", () => {
    const r = evaluateRequirement(
      req({ category: "submission", normalizedKey: "submission_hard_copy" }),
      emptySnapshot,
    );
    expect(r.status).toBe("not_applicable");
  });

  it("returns needs_verification for unknown normalized keys (never gap)", () => {
    const r = evaluateRequirement(
      req({ category: "other", normalizedKey: "some_novel_thing" }),
      emptySnapshot,
    );
    expect(r.status).toBe("needs_verification");
  });

  it("returns needs_verification when key is missing entirely", () => {
    const r = evaluateRequirement(
      req({ category: "other", normalizedKey: undefined }),
      emptySnapshot,
    );
    expect(r.status).toBe("needs_verification");
  });

  it("attaches non-empty reasoning to every evaluation", () => {
    const r = evaluateRequirement(
      req({ category: "certification", normalizedKey: "iso_27001" }),
      emptySnapshot,
    );
    expect(r.reasoning.length).toBeGreaterThan(0);
  });
});
