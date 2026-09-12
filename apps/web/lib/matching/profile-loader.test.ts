import { describe, expect, it, vi } from "vitest";
import { loadWorkspaceProfile } from "./profile-loader";

// The loader touches three tables; simplest fake — dispatch by table name.
function fakeSupabase(rows: {
  monitoring_profiles?: unknown[];
  workspace_capabilities?: unknown[];
  projects?: unknown[];
}) {
  return {
    from: vi.fn((table: string) => {
      const data = rows[table as keyof typeof rows] ?? [];
      return {
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data, error: null }),
        })),
      };
    }),
  } as unknown as Parameters<typeof loadWorkspaceProfile>[0];
}

describe("loadWorkspaceProfile", () => {
  it("returns an empty profile when the workspace has no data", async () => {
    const client = fakeSupabase({});
    const p = await loadWorkspaceProfile(client, "ws-1");
    expect(p.workspaceId).toBe("ws-1");
    expect(p.capabilities).toEqual([]);
    expect(p.sectors).toEqual([]);
    expect(p.countries).toEqual([]);
    expect(p.keywords).toEqual([]);
    expect(p.excludedKeywords).toEqual([]);
    expect(p.projectTitles).toEqual([]);
  });

  it("aggregates arrays across all ACTIVE monitoring profiles (dedupes)", async () => {
    const client = fakeSupabase({
      monitoring_profiles: [
        {
          workspace_id: "ws-1",
          is_active: true,
          country_codes: ["BD"],
          source_keys: [],
          sectors: ["Roads"],
          procurement_methods: [],
          keywords: ["road"],
          excluded_keywords: ["consultancy"],
        },
        {
          workspace_id: "ws-1",
          is_active: true,
          country_codes: ["BD", "IN"],
          source_keys: [],
          sectors: ["ICT"],
          procurement_methods: [],
          keywords: ["road", "erp"], // "road" is a dupe
          excluded_keywords: [],
        },
        {
          // inactive → should be ignored
          workspace_id: "ws-1",
          is_active: false,
          country_codes: ["ZZ"],
          source_keys: [],
          sectors: ["should_not_appear"],
          procurement_methods: [],
          keywords: [],
          excluded_keywords: [],
        },
      ],
    });
    const p = await loadWorkspaceProfile(client, "ws-1");
    expect(p.countries.sort()).toEqual(["BD", "IN"]);
    expect(p.sectors.sort()).toEqual(["ICT", "Roads"]);
    expect(p.keywords.sort()).toEqual(["erp", "road"]);
    expect(p.excludedKeywords).toEqual(["consultancy"]);
    expect(p.sectors).not.toContain("should_not_appear");
  });

  it("pulls capability labels from workspace_capabilities", async () => {
    const client = fakeSupabase({
      workspace_capabilities: [
        { workspace_id: "ws-1", label: "software_dev", source: "user" },
        { workspace_id: "ws-1", label: "erp", source: "auto_derived" },
      ],
    });
    const p = await loadWorkspaceProfile(client, "ws-1");
    expect(p.capabilities.sort()).toEqual(["erp", "software_dev"]);
  });

  it("pulls project titles from projects table", async () => {
    const client = fakeSupabase({
      projects: [
        { workspace_id: "ws-1", name: "Feeder road Sylhet" },
        { workspace_id: "ws-1", name: "Bridge in Rajshahi" },
      ],
    });
    const p = await loadWorkspaceProfile(client, "ws-1");
    expect(p.projectTitles).toEqual([
      "Feeder road Sylhet",
      "Bridge in Rajshahi",
    ]);
  });
});
