import { describe, expect, it } from "vitest";
import {
  CAPABILITY_TAXONOMY,
  bucketProjectToCapabilities,
} from "./taxonomy";

describe("CAPABILITY_TAXONOMY", () => {
  it("locks the SoT §16.7 seed list at 10 items", () => {
    expect(CAPABILITY_TAXONOMY).toHaveLength(10);
    for (const cap of CAPABILITY_TAXONOMY) {
      expect(cap.key).toBeTruthy();
      expect(cap.label).toBeTruthy();
      expect(Array.isArray(cap.signalWords)).toBe(true);
    }
  });

  it("keys are unique", () => {
    const keys = CAPABILITY_TAXONOMY.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("bucketProjectToCapabilities (cold-start auto-derive)", () => {
  it("returns capabilities with ≥ 2 signal-word hits (Phase 3 Q7 decision)", () => {
    const project = {
      title: "ERP implementation for a government agency",
      description: "SAP-based ERP roll-out with financial modules",
    };
    const result = bucketProjectToCapabilities(project);
    expect(result.map((r) => r.key)).toContain("erp");
  });

  it("does not suggest capabilities with only one weak signal-word hit", () => {
    const project = {
      title: "One-off SAP training session",
      description: null,
    };
    const result = bucketProjectToCapabilities(project);
    // Only "SAP" hit → below the ≥ 2 threshold → not suggested
    expect(result.map((r) => r.key)).not.toContain("erp");
  });

  it("returns confidence in (0, 1]", () => {
    const project = {
      title: "Software development for tender management",
      description: "Custom web application with database backend",
    };
    const results = bucketProjectToCapabilities(project);
    for (const r of results) {
      expect(r.confidence).toBeGreaterThan(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("is word-boundary aware (no substring false positives)", () => {
    const project = {
      title: "Data entry work for insurance company",
      description: null,
    };
    const result = bucketProjectToCapabilities(project);
    // "AI" should not match "insurance"
    expect(result.map((r) => r.key)).not.toContain("ai_ml");
  });

  it("is case insensitive", () => {
    const upper = {
      title: "ERP AND ACCOUNTING",
      description: "SAP finance ledger",
    };
    const lower = {
      title: "erp and accounting",
      description: "sap finance ledger",
    };
    const a = bucketProjectToCapabilities(upper).map((r) => r.key).sort();
    const b = bucketProjectToCapabilities(lower).map((r) => r.key).sort();
    expect(a).toEqual(b);
  });

  it("returns empty when nothing matches", () => {
    const project = { title: "supply of gauze", description: null };
    expect(bucketProjectToCapabilities(project)).toEqual([]);
  });
});
