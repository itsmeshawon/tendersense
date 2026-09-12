import { beforeEach, describe, expect, it, vi } from "vitest";

const repoMocks = vi.hoisted(() => ({
  upsertMatch: vi.fn(),
  upsertMatchesBulk: vi.fn(),
}));
const loaderMocks = vi.hoisted(() => ({
  loadWorkspaceProfile: vi.fn(),
}));

vi.mock("./repository", () => repoMocks);
vi.mock("./profile-loader", () => loaderMocks);

import { recomputeForWorkspace, recomputeForOpportunity } from "./recompute";
import type { ScorableOpportunity, WorkspaceProfile } from "./types";

const richProfile: WorkspaceProfile = {
  workspaceId: "ws-1",
  capabilities: ["civil_works"],
  sectors: ["Roads"],
  countries: ["BD"],
  keywords: ["road"],
  excludedKeywords: [],
  projectTitles: [], credentialKeys: [],
};

const opp: ScorableOpportunity = {
  id: "op-1",
  source_key: "world_bank",
  country_code: "BD",
  sector: ["Roads"],
  title: "Road construction",
  description: null,
};

function fakeSupabase(opportunities: ScorableOpportunity[]) {
  return {
    from: vi.fn((table: string) => {
      if (table === "opportunities") {
        return {
          select: vi.fn(() => ({
            gte: vi.fn(() => ({
              order: vi
                .fn()
                .mockResolvedValue({ data: opportunities, error: null }),
            })),
          })),
        };
      }
      if (table === "workspaces") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: [{ id: "ws-1" }, { id: "ws-2" }],
              error: null,
            }),
          })),
        };
      }
      return {
        select: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) })),
      };
    }),
  } as unknown as Parameters<typeof recomputeForWorkspace>[0];
}

describe("recomputeForWorkspace", () => {
  beforeEach(() => {
    repoMocks.upsertMatch.mockReset().mockResolvedValue(undefined);
    repoMocks.upsertMatchesBulk.mockReset().mockResolvedValue(undefined);
    loaderMocks.loadWorkspaceProfile.mockReset().mockResolvedValue(richProfile);
  });

  it("bulk-upserts scored matches in one round-trip per chunk", async () => {
    const client = fakeSupabase([opp]);
    const result = await recomputeForWorkspace(client, "ws-1");
    expect(result.matched).toBe(1);
    expect(repoMocks.upsertMatchesBulk).toHaveBeenCalledTimes(1);
    const [, rows] = repoMocks.upsertMatchesBulk.mock.calls[0];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      workspaceId: "ws-1",
      opportunityId: "op-1",
      grade: "A",
    });
  });

  it("returns {matched:0} when workspace has zero opportunities in window", async () => {
    const client = fakeSupabase([]);
    const result = await recomputeForWorkspace(client, "ws-1");
    expect(result.matched).toBe(0);
    expect(repoMocks.upsertMatchesBulk).not.toHaveBeenCalled();
  });

  it("splits large opportunity sets into chunks — one bulk call per chunk", async () => {
    const many = Array.from({ length: 250 }, (_, i) => ({ ...opp, id: `op-${i}` }));
    const client = fakeSupabase(many);
    const result = await recomputeForWorkspace(client, "ws-1", { chunkSize: 100 });
    expect(result.matched).toBe(250);
    // 250 / 100 = 3 chunks (100 + 100 + 50)
    expect(repoMocks.upsertMatchesBulk).toHaveBeenCalledTimes(3);
  });
});

describe("recomputeForOpportunity", () => {
  beforeEach(() => {
    repoMocks.upsertMatch.mockReset().mockResolvedValue(undefined);
    loaderMocks.loadWorkspaceProfile.mockReset().mockResolvedValue(richProfile);
  });

  it("recomputes match for every workspace that exists (best-effort fanout)", async () => {
    // Two workspaces returned by the workspaces query above
    const client = {
      from: vi.fn((table: string) => {
        if (table === "workspaces") {
          return {
            select: vi.fn(() => ({
              in: vi.fn().mockResolvedValue({
                data: [{ id: "ws-1" }, { id: "ws-2" }],
                error: null,
              }),
              eq: vi.fn().mockResolvedValue({
                data: [{ id: "ws-1" }, { id: "ws-2" }],
                error: null,
              }),
            })),
          };
        }
        if (table === "monitoring_profiles") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                data: [{ workspace_id: "ws-1" }, { workspace_id: "ws-2" }],
                error: null,
              }),
            })),
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        };
      }),
    } as unknown as Parameters<typeof recomputeForOpportunity>[0];
    const result = await recomputeForOpportunity(client, opp);
    expect(result.workspacesUpdated).toBe(2);
    expect(repoMocks.upsertMatch).toHaveBeenCalledTimes(2);
  });
});
