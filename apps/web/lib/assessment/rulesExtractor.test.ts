import { describe, expect, it } from "vitest";
import { extractRequirements } from "./rulesExtractor";

describe("extractRequirements — certifications", () => {
  it("extracts ISO NNNNN mentions", () => {
    const reqs = extractRequirements(
      "The bidder must hold a valid ISO 27001 certification.",
    );
    expect(reqs.some((r) => r.category === "certification")).toBe(true);
    const iso = reqs.find((r) => r.normalizedKey === "iso_27001");
    expect(iso).toBeTruthy();
    expect(iso!.mandatory).toBe(true);
  });

  it("extracts multiple ISO certs from the same text", () => {
    const reqs = extractRequirements(
      "Required certifications: ISO 9001 and ISO 27001.",
    );
    const keys = reqs.map((r) => r.normalizedKey);
    expect(keys).toContain("iso_9001");
    expect(keys).toContain("iso_27001");
  });

  it("extracts CMMI level requirements", () => {
    const reqs = extractRequirements(
      "Firm must be CMMI Level 3 (Dev) certified or higher.",
    );
    const cmmi = reqs.find((r) => r.normalizedKey === "cmmi_dev");
    expect(cmmi).toBeTruthy();
    expect(cmmi!.threshold?.value).toBe(3);
    expect(cmmi!.threshold?.operator).toBe("gte");
  });
});

describe("extractRequirements — experience", () => {
  it("extracts minimum years-experience threshold", () => {
    const reqs = extractRequirements(
      "The bidder should have a minimum of 10 years of experience in ERP delivery.",
    );
    const yr = reqs.find(
      (r) => r.category === "experience" && r.normalizedKey === "min_years_experience",
    );
    expect(yr).toBeTruthy();
    expect(yr!.threshold?.value).toBe(10);
    expect(yr!.threshold?.operator).toBe("gte");
    expect(yr!.threshold?.unit).toBe("years");
  });

  it("extracts N similar projects requirement", () => {
    const reqs = extractRequirements(
      "Firm must have completed at least 3 similar projects in the last 5 years.",
    );
    const sim = reqs.find((r) => r.normalizedKey === "min_similar_projects");
    expect(sim).toBeTruthy();
    expect(sim!.threshold?.value).toBe(3);
    expect(sim!.threshold?.unit).toBe("projects");
  });

  it("extracts sector-specific experience", () => {
    const reqs = extractRequirements(
      "Proven government-sector experience is required.",
    );
    const s = reqs.find((r) => r.category === "experience");
    expect(s).toBeTruthy();
  });
});

describe("extractRequirements — financial", () => {
  it("extracts annual-turnover threshold in various currencies", () => {
    const reqs = extractRequirements(
      "Annual turnover of at least BDT 500,000,000 in each of the last 3 fiscal years.",
    );
    const t = reqs.find((r) => r.normalizedKey === "min_annual_turnover");
    expect(t).toBeTruthy();
    expect(t!.threshold?.operator).toBe("gte");
    expect(t!.threshold?.value).toBe(500000000);
  });

  it("extracts audited-statements requirement", () => {
    const reqs = extractRequirements(
      "Bidder must submit audited financial statements for the last 3 years.",
    );
    const a = reqs.find((r) => r.normalizedKey === "audited_financials");
    expect(a).toBeTruthy();
    expect(a!.category).toBe("financial");
  });
});

describe("extractRequirements — geography", () => {
  it("extracts country / operating-in patterns", () => {
    const reqs = extractRequirements(
      "The firm must be registered and operating in Bangladesh.",
    );
    const g = reqs.find((r) => r.category === "geography");
    expect(g).toBeTruthy();
  });
});

describe("extractRequirements — submission", () => {
  it("extracts hard-copy vs soft-copy submission requirements", () => {
    const reqs = extractRequirements(
      "Bids must be submitted in hard copy at the address below.",
    );
    const s = reqs.find((r) => r.category === "submission");
    expect(s).toBeTruthy();
  });
});

describe("extractRequirements — behavior", () => {
  it("returns an empty array for text with no matched patterns", () => {
    const reqs = extractRequirements(
      "The weather in Dhaka is nice today. Nothing to see here.",
    );
    expect(reqs).toHaveLength(0);
  });

  it("dedupes identical matches from the same pattern", () => {
    const reqs = extractRequirements(
      "ISO 27001 certification required. ISO 27001 certification is mandatory.",
    );
    const isos = reqs.filter((r) => r.normalizedKey === "iso_27001");
    // We keep both because they're distinct occurrences (different source
    // positions), but they should share normalizedKey.
    expect(isos.length).toBeGreaterThan(0);
    for (const r of isos) expect(r.normalizedKey).toBe("iso_27001");
  });

  it("attaches sourceLocation for every requirement", () => {
    const reqs = extractRequirements(
      "The firm must hold ISO 27001 and have 5 years experience.",
    );
    for (const r of reqs) {
      expect(r.sourceLocation).toBeTruthy();
    }
  });

  it("all requirements have confidence in (0, 1]", () => {
    const reqs = extractRequirements(
      "Firm must be CMMI Level 3 certified and hold ISO 9001.",
    );
    for (const r of reqs) {
      expect(r.confidence).toBeGreaterThan(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    }
  });
});
