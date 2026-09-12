import { describe, expect, it, vi } from "vitest";
import {
  listMatchesForWorkspace,
  listWorkspaceCapabilities,
  upsertMatch,
  upsertWorkspaceCapabilities,
  type OpportunityMatchRow,
  type WorkspaceCapabilityRow,
} from "./repository";

const sampleMatch: OpportunityMatchRow = {
  id: "m-1",
  workspace_id: "ws-1",
  opportunity_id: "op-1",
  score: 85,
  grade: "A",
  reasons: [],
  concerns: [],
  scoring_version: 1,
  computed_at: "2026-09-12T00:00:00Z",
};

const sampleCap: WorkspaceCapabilityRow = {
  id: "c-1",
  workspace_id: "ws-1",
  label: "software_dev",
  source: "user",
  confidence: null,
  created_at: "2026-09-12T00:00:00Z",
  updated_at: "2026-09-12T00:00:00Z",
};

function fakeSelectChain(finalValue: unknown) {
  const orderMock = vi.fn().mockResolvedValue(finalValue);
  const inMock = vi.fn().mockResolvedValue(finalValue);
  const eqMock = vi.fn(() => ({
    order: orderMock,
    in: inMock,
    then: (r: (v: unknown) => void) => Promise.resolve(finalValue).then(r),
  }));
  const selectMock = vi.fn(() => ({ eq: eqMock }));
  return {
    from: vi.fn(() => ({ select: selectMock })),
    _spies: { selectMock, eqMock, inMock, orderMock },
  };
}

function fakeUpsertChain(finalValue: unknown) {
  const upsertMock = vi.fn().mockResolvedValue(finalValue);
  return {
    from: vi.fn(() => ({ upsert: upsertMock })),
    _spies: { upsertMock },
  };
}

describe("listMatchesForWorkspace", () => {
  it("selects for workspace, orders by score desc", async () => {
    const client = fakeSelectChain({ data: [sampleMatch], error: null });
    const rows = await listMatchesForWorkspace(
      client as unknown as Parameters<typeof listMatchesForWorkspace>[0],
      "ws-1",
    );
    expect(rows).toEqual([sampleMatch]);
    expect(client._spies.eqMock).toHaveBeenCalledWith("workspace_id", "ws-1");
    expect(client._spies.orderMock).toHaveBeenCalledWith("score", {
      ascending: false,
    });
  });
});

describe("upsertMatch", () => {
  it("upserts by (workspace_id, opportunity_id)", async () => {
    const client = fakeUpsertChain({ error: null });
    await upsertMatch(
      client as unknown as Parameters<typeof upsertMatch>[0],
      {
        workspaceId: "ws-1",
        opportunityId: "op-1",
        score: 85,
        grade: "A",
        reasons: [],
        concerns: [],
        scoringVersion: 1,
      },
    );
    const [row, opts] = client._spies.upsertMock.mock.calls[0];
    expect(row).toMatchObject({
      workspace_id: "ws-1",
      opportunity_id: "op-1",
      score: 85,
      grade: "A",
      scoring_version: 1,
    });
    expect(opts).toMatchObject({ onConflict: "workspace_id,opportunity_id" });
  });
});

describe("listWorkspaceCapabilities", () => {
  it("selects workspace_id-filtered rows", async () => {
    const client = fakeSelectChain({ data: [sampleCap], error: null });
    const rows = await listWorkspaceCapabilities(
      client as unknown as Parameters<typeof listWorkspaceCapabilities>[0],
      "ws-1",
    );
    expect(rows).toEqual([sampleCap]);
    expect(client._spies.eqMock).toHaveBeenCalledWith("workspace_id", "ws-1");
  });
});

describe("upsertWorkspaceCapabilities", () => {
  it("bulk-upserts capabilities by (workspace_id, label)", async () => {
    const client = fakeUpsertChain({ error: null });
    await upsertWorkspaceCapabilities(
      client as unknown as Parameters<typeof upsertWorkspaceCapabilities>[0],
      "ws-1",
      [
        { label: "software_dev", source: "user" },
        { label: "erp", source: "auto_derived", confidence: 0.4 },
      ],
    );
    const [rows, opts] = client._spies.upsertMock.mock.calls[0];
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      workspace_id: "ws-1",
      label: "software_dev",
      source: "user",
    });
    expect(opts).toMatchObject({ onConflict: "workspace_id,label" });
  });

  it("is a no-op when caps list is empty", async () => {
    const client = fakeUpsertChain({ error: null });
    await upsertWorkspaceCapabilities(
      client as unknown as Parameters<typeof upsertWorkspaceCapabilities>[0],
      "ws-1",
      [],
    );
    expect(client._spies.upsertMock).not.toHaveBeenCalled();
  });
});
