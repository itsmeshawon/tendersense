import { beforeEach, describe, expect, it, vi } from "vitest";

const repoMocks = vi.hoisted(() => ({
  insertNotification: vi.fn(),
}));
vi.mock("./repository", () => repoMocks);

import { fanoutRevisionNotifications } from "./fanout";
import type { MonitoringProfile } from "../monitoring/repository";

function profile(
  workspaceId: string,
  overrides: Partial<MonitoringProfile> = {},
): MonitoringProfile {
  return {
    id: `p-${workspaceId}`,
    workspace_id: workspaceId,
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

function fakeSupabase(profiles: MonitoringProfile[]) {
  const eq = vi.fn().mockResolvedValue({ data: profiles, error: null });
  const select = vi.fn(() => ({ eq }));
  return {
    from: vi.fn(() => ({ select })),
  } as unknown as Parameters<typeof fanoutRevisionNotifications>[0];
}

const opp = {
  id: "op-1",
  source_key: "world_bank",
  country_code: "BD",
  procurement_method: "OTM",
  sector: null,
  title: "Road construction",
  description: null,
  reference_no: "REF-42",
};

describe("fanoutRevisionNotifications", () => {
  beforeEach(() => {
    repoMocks.insertNotification.mockReset();
    repoMocks.insertNotification.mockResolvedValue(undefined);
  });

  it("inserts a notification for each matching workspace", async () => {
    const client = fakeSupabase([
      profile("ws-A", { country_codes: ["BD"] }),
      profile("ws-B", { country_codes: ["IN"] }), // won't match
      profile("ws-C", { keywords: ["road"] }),
    ]);
    const result = await fanoutRevisionNotifications(client, {
      revisionId: "r-1",
      opportunity: opp,
      changedFields: ["title"],
    });
    expect(result.workspacesNotified).toBe(2);
    expect(repoMocks.insertNotification).toHaveBeenCalledTimes(2);
    const wsIds = repoMocks.insertNotification.mock.calls.map(
      (c) => (c[1] as { workspaceId: string }).workspaceId,
    );
    expect(wsIds).toContain("ws-A");
    expect(wsIds).toContain("ws-C");
    expect(wsIds).not.toContain("ws-B");
  });

  it('uses "Deadline changed" title when changedFields includes deadline_at', async () => {
    const client = fakeSupabase([profile("ws-A")]);
    await fanoutRevisionNotifications(client, {
      revisionId: "r-1",
      opportunity: opp,
      changedFields: ["deadline_at"],
    });
    expect(repoMocks.insertNotification).toHaveBeenCalledWith(
      client,
      expect.objectContaining({ title: "Deadline changed" }),
    );
  });

  it('uses "Tender amended" title for non-deadline changes', async () => {
    const client = fakeSupabase([profile("ws-A")]);
    await fanoutRevisionNotifications(client, {
      revisionId: "r-1",
      opportunity: opp,
      changedFields: ["title"],
    });
    expect(repoMocks.insertNotification).toHaveBeenCalledWith(
      client,
      expect.objectContaining({ title: "Tender amended" }),
    );
  });

  it("dedupes profiles from the same workspace (one notification only)", async () => {
    const client = fakeSupabase([
      profile("ws-A", { country_codes: ["BD"] }),
      profile("ws-A", { keywords: ["road"] }),
    ]);
    const result = await fanoutRevisionNotifications(client, {
      revisionId: "r-1",
      opportunity: opp,
      changedFields: ["title"],
    });
    expect(result.workspacesNotified).toBe(1);
    expect(repoMocks.insertNotification).toHaveBeenCalledTimes(1);
  });

  it("returns 0 when supabase profile query fails (logs but does not throw)", async () => {
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi
            .fn()
            .mockResolvedValue({ data: null, error: { message: "boom" } }),
        })),
      })),
    } as unknown as Parameters<typeof fanoutRevisionNotifications>[0];
    const result = await fanoutRevisionNotifications(client, {
      revisionId: "r-1",
      opportunity: opp,
      changedFields: [],
    });
    expect(result.workspacesNotified).toBe(0);
  });
});
