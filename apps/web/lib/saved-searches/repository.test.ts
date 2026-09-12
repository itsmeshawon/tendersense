import { describe, expect, it, vi } from "vitest";
import {
  createSavedSearch,
  deleteSavedSearch,
  listSavedSearches,
  type SavedSearch,
} from "./repository";

const sample: SavedSearch = {
  id: "ss-1",
  workspace_id: "ws-1",
  created_by: "user-1",
  name: "BD infra open",
  query_params: { country: "BD", status: "open", q: "road" },
  created_at: "2026-09-12T00:00:00Z",
  updated_at: "2026-09-12T00:00:00Z",
};

function fakeSelectChain(finalValue: unknown) {
  const orderMock = vi.fn().mockResolvedValue(finalValue);
  const eqMock = vi.fn(() => ({ order: orderMock }));
  const selectMock = vi.fn(() => ({ eq: eqMock }));
  return {
    from: vi.fn(() => ({ select: selectMock })),
    _spies: { selectMock, eqMock, orderMock },
  };
}

function fakeInsertChain(finalValue: unknown) {
  const single = vi.fn().mockResolvedValue(finalValue);
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));
  return {
    from: vi.fn(() => ({ insert })),
    _spies: { insert, select, single },
  };
}

function fakeDeleteChain(finalValue: unknown) {
  const eqMock = vi.fn().mockResolvedValue(finalValue);
  const deleteMock = vi.fn(() => ({ eq: eqMock }));
  return {
    from: vi.fn(() => ({ delete: deleteMock })),
    _spies: { deleteMock, eqMock },
  };
}

describe("listSavedSearches", () => {
  it("queries by workspace_id and orders by created_at desc", async () => {
    const client = fakeSelectChain({ data: [sample], error: null });
    const rows = await listSavedSearches(
      client as unknown as Parameters<typeof listSavedSearches>[0],
      "ws-1",
    );
    expect(rows).toEqual([sample]);
    expect(client._spies.eqMock).toHaveBeenCalledWith("workspace_id", "ws-1");
    expect(client._spies.orderMock).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
  });

  it("returns [] on null data", async () => {
    const client = fakeSelectChain({ data: null, error: null });
    await expect(
      listSavedSearches(
        client as unknown as Parameters<typeof listSavedSearches>[0],
        "ws-1",
      ),
    ).resolves.toEqual([]);
  });
});

describe("createSavedSearch", () => {
  it("inserts a row with workspace_id + name + params", async () => {
    const client = fakeInsertChain({ data: sample, error: null });
    const result = await createSavedSearch(
      client as unknown as Parameters<typeof createSavedSearch>[0],
      {
        workspaceId: "ws-1",
        createdBy: "user-1",
        name: "BD infra open",
        queryParams: { country: "BD", status: "open" },
      },
    );
    expect(result).toEqual(sample);
    expect(client._spies.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: "ws-1",
        created_by: "user-1",
        name: "BD infra open",
        query_params: { country: "BD", status: "open" },
      }),
    );
  });

  it("trims the name before persisting", async () => {
    const client = fakeInsertChain({ data: sample, error: null });
    await createSavedSearch(
      client as unknown as Parameters<typeof createSavedSearch>[0],
      {
        workspaceId: "ws-1",
        createdBy: "user-1",
        name: "  padded  ",
        queryParams: {},
      },
    );
    expect(client._spies.insert).toHaveBeenCalledWith(
      expect.objectContaining({ name: "padded" }),
    );
  });

  it("throws on supabase error", async () => {
    const client = fakeInsertChain({ data: null, error: { message: "boom" } });
    await expect(
      createSavedSearch(
        client as unknown as Parameters<typeof createSavedSearch>[0],
        { workspaceId: "ws-1", createdBy: "user-1", name: "x", queryParams: {} },
      ),
    ).rejects.toThrow(/boom/);
  });
});

describe("deleteSavedSearch", () => {
  it("deletes by id", async () => {
    const client = fakeDeleteChain({ error: null });
    await deleteSavedSearch(
      client as unknown as Parameters<typeof deleteSavedSearch>[0],
      "ss-1",
    );
    expect(client._spies.eqMock).toHaveBeenCalledWith("id", "ss-1");
  });
});
