import { describe, expect, it } from "vitest";
import { profileMatchesOpportunity } from "./matching";
import type { MonitoringProfile } from "../monitoring/repository";

function profile(
  overrides: Partial<MonitoringProfile> = {},
): MonitoringProfile {
  return {
    id: "p-1",
    workspace_id: "ws-1",
    created_by: "u-1",
    name: "test",
    is_active: true,
    country_codes: [],
    source_keys: [],
    sectors: [],
    procurement_methods: [],
    keywords: [],
    excluded_keywords: [],
    min_value: null,
    max_value: null,
    currency: null,
    min_days_remaining: null,
    created_at: "2026-09-12T00:00:00Z",
    updated_at: "2026-09-12T00:00:00Z",
    ...overrides,
  };
}

const opp = (overrides: Record<string, unknown> = {}) => ({
  id: "op-1",
  source_key: "world_bank",
  country_code: "BD",
  procurement_method: "OTM",
  sector: null,
  title: "Road construction project",
  description: null,
  ...overrides,
});

describe("profileMatchesOpportunity", () => {
  it("matches when all filter arrays are empty (default open profile)", () => {
    expect(profileMatchesOpportunity(profile(), opp())).toBe(true);
  });

  it("matches when country is in country_codes", () => {
    expect(
      profileMatchesOpportunity(profile({ country_codes: ["BD"] }), opp()),
    ).toBe(true);
  });

  it("rejects when country is not in country_codes", () => {
    expect(
      profileMatchesOpportunity(
        profile({ country_codes: ["IN"] }),
        opp({ country_code: "BD" }),
      ),
    ).toBe(false);
  });

  it("matches keyword case-insensitively against title", () => {
    expect(
      profileMatchesOpportunity(profile({ keywords: ["ROAD"] }), opp()),
    ).toBe(true);
  });

  it("respects word boundaries in keyword matching (SME does not match SMEs)", () => {
    expect(
      profileMatchesOpportunity(
        profile({ keywords: ["SME"] }),
        opp({ title: "Support to SMEs" }),
      ),
    ).toBe(false);
    expect(
      profileMatchesOpportunity(
        profile({ keywords: ["SME"] }),
        opp({ title: "Program for SME development" }),
      ),
    ).toBe(true);
  });

  it("rejects when an excluded_keyword matches", () => {
    expect(
      profileMatchesOpportunity(
        profile({ excluded_keywords: ["consultancy"] }),
        opp({ title: "Road consultancy work" }),
      ),
    ).toBe(false);
  });

  it("requires all keyword filters to match (AND semantics not implemented) — keywords are OR", () => {
    // Per plan §3 ADR 0011: filters are AND across dimensions but keywords
    // within one profile are OR (any match). Documenting expected behavior.
    expect(
      profileMatchesOpportunity(
        profile({ keywords: ["road", "bridge"] }),
        opp({ title: "Bridge construction only" }),
      ),
    ).toBe(true);
  });

  it("combines multiple dimensions with AND", () => {
    const p = profile({
      country_codes: ["BD"],
      source_keys: ["world_bank"],
      keywords: ["road"],
    });
    expect(profileMatchesOpportunity(p, opp())).toBe(true);
    expect(
      profileMatchesOpportunity(p, opp({ source_key: "bd_egp" })),
    ).toBe(false);
  });

  it("matches sector when opportunity.sector array overlaps profile.sectors", () => {
    expect(
      profileMatchesOpportunity(
        profile({ sectors: ["Roads"] }),
        opp({ sector: ["Roads", "Bridges"] }),
      ),
    ).toBe(true);
    expect(
      profileMatchesOpportunity(
        profile({ sectors: ["ICT"] }),
        opp({ sector: ["Roads"] }),
      ),
    ).toBe(false);
  });

  it("does not match when profile requires a sector and opportunity has none", () => {
    expect(
      profileMatchesOpportunity(
        profile({ sectors: ["Roads"] }),
        opp({ sector: null }),
      ),
    ).toBe(false);
  });
});
