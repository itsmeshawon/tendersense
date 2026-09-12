import { describe, expect, it } from "vitest";
import { computeSignals } from "./signals";
import type { ScorableOpportunity, WorkspaceProfile } from "./types";

const baseWorkspace: WorkspaceProfile = {
  workspaceId: "ws-1",
  capabilities: [],
  sectors: [],
  countries: [],
  keywords: [],
  excludedKeywords: [],
  projectTitles: [],
  credentialKeys: [],
};

const baseOpp: ScorableOpportunity = {
  id: "op-1",
  source_key: "world_bank",
  country_code: "BD",
  sector: null,
  title: "Road construction project in Dhaka",
  description: null,
};

describe("computeSignals — capability", () => {
  it("full contribution when the workspace has a capability whose signal words hit the opportunity", () => {
    const outcomes = computeSignals(
      { ...baseWorkspace, capabilities: ["civil_works"] },
      { ...baseOpp, title: "Bridge construction and road works" },
    );
    const cap = outcomes.find((o) => o.dimension === "capability");
    expect(cap?.applicable).toBe(true);
    expect(cap!.contribution).toBeGreaterThan(0);
  });

  it("marks capability inapplicable when workspace has no capabilities", () => {
    const outcomes = computeSignals(baseWorkspace, baseOpp);
    const cap = outcomes.find((o) => o.dimension === "capability");
    expect(cap?.applicable).toBe(false);
  });
});

describe("computeSignals — country", () => {
  it("full contribution when workspace country matches opportunity country", () => {
    const outcomes = computeSignals(
      { ...baseWorkspace, countries: ["BD"] },
      baseOpp,
    );
    const c = outcomes.find((o) => o.dimension === "country");
    expect(c?.applicable).toBe(true);
    expect(c!.contribution).toBe(10);
  });

  it("zero contribution when workspace country doesn't match", () => {
    const outcomes = computeSignals(
      { ...baseWorkspace, countries: ["IN"] },
      baseOpp,
    );
    const c = outcomes.find((o) => o.dimension === "country");
    expect(c?.applicable).toBe(true);
    expect(c!.contribution).toBe(0);
  });

  it("inapplicable when workspace has no country set", () => {
    const outcomes = computeSignals(baseWorkspace, baseOpp);
    const c = outcomes.find((o) => o.dimension === "country");
    expect(c?.applicable).toBe(false);
  });
});

describe("computeSignals — sector", () => {
  it("full contribution on overlap between workspace and opportunity sectors", () => {
    const outcomes = computeSignals(
      { ...baseWorkspace, sectors: ["Roads"] },
      { ...baseOpp, sector: ["Roads", "Bridges"] },
    );
    const s = outcomes.find((o) => o.dimension === "sector");
    expect(s?.applicable).toBe(true);
    expect(s!.contribution).toBe(18);
  });

  it("zero contribution when opportunity has sectors but no overlap", () => {
    const outcomes = computeSignals(
      { ...baseWorkspace, sectors: ["ICT"] },
      { ...baseOpp, sector: ["Roads"] },
    );
    const s = outcomes.find((o) => o.dimension === "sector");
    expect(s!.contribution).toBe(0);
  });

  it("inapplicable when opportunity has no sector data", () => {
    const outcomes = computeSignals(
      { ...baseWorkspace, sectors: ["Roads"] },
      { ...baseOpp, sector: null },
    );
    const s = outcomes.find((o) => o.dimension === "sector");
    expect(s?.applicable).toBe(false);
  });
});

describe("computeSignals — keyword", () => {
  it("proportional contribution to fraction of workspace keywords hitting the opportunity text", () => {
    const outcomes = computeSignals(
      { ...baseWorkspace, keywords: ["road", "bridge"] },
      { ...baseOpp, title: "Road paving project", description: null },
    );
    const k = outcomes.find((o) => o.dimension === "keyword");
    expect(k?.applicable).toBe(true);
    // 1 of 2 keywords hit → 18 * 0.5 = 9
    expect(k!.contribution).toBe(9);
  });

  it("word-boundary aware (SME does not match SMEs)", () => {
    const outcomes = computeSignals(
      { ...baseWorkspace, keywords: ["SME"] },
      { ...baseOpp, title: "Support to SMEs", description: null },
    );
    const k = outcomes.find((o) => o.dimension === "keyword");
    expect(k!.contribution).toBe(0);
  });
});

describe("computeSignals — past_project", () => {
  it("full contribution when a past project title contains the opportunity title's dominant word", () => {
    const outcomes = computeSignals(
      {
        ...baseWorkspace,
        projectTitles: ["Feeder road construction in Sylhet"],
      },
      { ...baseOpp, title: "Rural road construction Dhaka" },
    );
    const p = outcomes.find((o) => o.dimension === "past_project");
    expect(p?.applicable).toBe(true);
    expect(p!.contribution).toBeGreaterThan(0);
  });

  it("inapplicable when workspace has zero past projects", () => {
    const outcomes = computeSignals(baseWorkspace, baseOpp);
    const p = outcomes.find((o) => o.dimension === "past_project");
    expect(p?.applicable).toBe(false);
  });
});
