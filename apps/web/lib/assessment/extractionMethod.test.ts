import { describe, expect, it } from "vitest";
import { nextExtractionMethodForManualAdd } from "./extractionMethod";

describe("nextExtractionMethodForManualAdd", () => {
  it("promotes rules → mixed when a manual req is added", () => {
    expect(nextExtractionMethodForManualAdd("rules")).toBe("mixed");
  });

  it("keeps mixed → mixed", () => {
    expect(nextExtractionMethodForManualAdd("mixed")).toBe("mixed");
  });

  it("keeps manual → manual", () => {
    expect(nextExtractionMethodForManualAdd("manual")).toBe("manual");
  });
});
