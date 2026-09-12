import { describe, expect, it } from "vitest";
import { REQUIREMENT_CATEGORIES } from "./types";

describe("REQUIREMENT_CATEGORIES", () => {
  it("matches SoT §21 — 11 categories exactly", () => {
    expect(REQUIREMENT_CATEGORIES).toHaveLength(11);
    expect(REQUIREMENT_CATEGORIES).toEqual([
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
    ]);
  });
});
