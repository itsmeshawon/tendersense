import { describe, expect, it } from "vitest";
import { scoreOpportunity } from "./score";
import type { ScorableOpportunity, WorkspaceProfile } from "./types";

const richWorkspace: WorkspaceProfile = {
  workspaceId: "ws-1",
  capabilities: ["civil_works"],
  sectors: ["Roads"],
  countries: ["BD"],
  keywords: ["road", "bridge"],
  excludedKeywords: [],
  projectTitles: ["Feeder road construction Sylhet"],
};

const roadOpp: ScorableOpportunity = {
  id: "op-1",
  source_key: "bd_egp",
  country_code: "BD",
  sector: ["Roads"],
  title: "Rural road construction in Dhaka",
  description: null,
};

describe("scoreOpportunity — grade mapping", () => {
  it("full signal alignment produces A grade (≥ 85)", () => {
    const r = scoreOpportunity(richWorkspace, roadOpp);
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.grade).toBe("A");
  });

  it("partial alignment produces C or D grade", () => {
    // Workspace signals applicable but MISALIGNED on multiple dims
    const partialWs: WorkspaceProfile = {
      workspaceId: "ws-1",
      capabilities: ["software_dev"], // won't hit a road tender
      sectors: ["ICT"], // won't overlap road sector
      countries: ["BD"], // hits
      keywords: ["ERP"], // won't hit
      excludedKeywords: [],
      projectTitles: [], // inapplicable
    };
    const r = scoreOpportunity(partialWs, roadOpp);
    // Applicable: capability(35, 0 hits) + sector(20, no overlap) +
    // country(10, hit) + keyword(20, no hits) = 85 raw weight, 10 pts
    // Redistributed: 10/85 × 100 ≈ 12 → D
    expect(r.grade === "C" || r.grade === "D").toBe(true);
  });

  it("returns need_more_info when workspace has zero signals of any kind", () => {
    const empty: WorkspaceProfile = {
      workspaceId: "ws-empty",
      capabilities: [],
      sectors: [],
      countries: [],
      keywords: [],
      excludedKeywords: [],
      projectTitles: [],
    };
    const r = scoreOpportunity(empty, roadOpp);
    expect(r.grade).toBe("need_more_info");
  });

  it("returns not_eligible when an excluded_keyword hits the opportunity", () => {
    const ws: WorkspaceProfile = {
      ...richWorkspace,
      excludedKeywords: ["consultancy"],
    };
    const opp = { ...roadOpp, title: "Consultancy services on road design" };
    const r = scoreOpportunity(ws, opp);
    expect(r.grade).toBe("not_eligible");
  });
});

describe("scoreOpportunity — redistribution", () => {
  it("redistributes weight over applicable dimensions when some are inapplicable", () => {
    // Workspace has ONLY capability signal; other dimensions inapplicable
    const ws: WorkspaceProfile = {
      workspaceId: "ws-1",
      capabilities: ["civil_works"],
      sectors: [],
      countries: [],
      keywords: [],
      excludedKeywords: [],
      projectTitles: [],
    };
    const r = scoreOpportunity(ws, roadOpp);
    // Only 1 signal applicable (capability, 35 raw pts) fully hit →
    // redistributed to 100 (full)
    expect(r.score).toBe(100);
    expect(r.grade).toBe("A");
  });

  it("does not silently zero out inapplicable dimensions", () => {
    // Sector applicable but 0 (no overlap); country not applicable
    const ws: WorkspaceProfile = {
      workspaceId: "ws-1",
      capabilities: ["civil_works"],
      sectors: ["ICT"],
      countries: [], // inapplicable
      keywords: [],
      excludedKeywords: [],
      projectTitles: [],
    };
    const r = scoreOpportunity(ws, roadOpp);
    // Applicable weight = capability (35) + sector (20) = 55
    // Contributions: capability 35 + sector 0 = 35 raw
    // Redistributed: 35 / 55 * 100 ≈ 64
    expect(r.score).toBeGreaterThan(50);
    expect(r.score).toBeLessThan(85);
    expect(r.grade).toBe("C");
  });
});

describe("scoreOpportunity — reasons + concerns", () => {
  it("reasons are the top positive contributions, sorted desc", () => {
    const r = scoreOpportunity(richWorkspace, roadOpp);
    expect(r.reasons.length).toBeGreaterThan(0);
    for (let i = 1; i < r.reasons.length; i += 1) {
      expect(r.reasons[i - 1].contribution).toBeGreaterThanOrEqual(
        r.reasons[i].contribution,
      );
    }
  });

  it("concerns include applicable dimensions with zero or low contribution", () => {
    const ws: WorkspaceProfile = {
      ...richWorkspace,
      keywords: ["fintech"], // won't hit
    };
    const r = scoreOpportunity(ws, roadOpp);
    const dims = r.concerns.map((c) => c.dimension);
    expect(dims).toContain("keyword");
  });

  it("includes scoringVersion on the result", () => {
    const r = scoreOpportunity(richWorkspace, roadOpp);
    expect(r.scoringVersion).toBeGreaterThan(0);
  });
});
