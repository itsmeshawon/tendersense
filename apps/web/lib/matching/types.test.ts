import { describe, expect, it } from "vitest";
import {
  DIMENSION_WEIGHTS,
  GRADE_BOUNDARIES,
  SCORING_VERSION,
  type Dimension,
} from "./types";

describe("scoring constants", () => {
  it("dimension weights sum to exactly 100", () => {
    const total = Object.values(DIMENSION_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });

  it("has five dimensions (trimmed from SoT §19.2 nine — see plan §2a)", () => {
    const dims = Object.keys(DIMENSION_WEIGHTS) as Dimension[];
    expect(dims).toHaveLength(5);
    expect(dims).toEqual(
      expect.arrayContaining([
        "capability",
        "sector",
        "keyword",
        "past_project",
        "country",
      ]),
    );
  });

  it("grade boundaries are monotonic and lock ADR 0006 §6 values", () => {
    expect(GRADE_BOUNDARIES.A).toBe(85);
    expect(GRADE_BOUNDARIES.B).toBe(70);
    expect(GRADE_BOUNDARIES.C).toBe(50);
    expect(GRADE_BOUNDARIES.D).toBe(0);
    expect(GRADE_BOUNDARIES.A).toBeGreaterThan(GRADE_BOUNDARIES.B);
    expect(GRADE_BOUNDARIES.B).toBeGreaterThan(GRADE_BOUNDARIES.C);
    expect(GRADE_BOUNDARIES.C).toBeGreaterThan(GRADE_BOUNDARIES.D);
  });

  it("SCORING_VERSION is a positive integer", () => {
    expect(Number.isInteger(SCORING_VERSION)).toBe(true);
    expect(SCORING_VERSION).toBeGreaterThan(0);
  });
});
