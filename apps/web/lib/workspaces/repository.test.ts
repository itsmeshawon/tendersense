import { describe, expect, it, vi } from "vitest";
import {
  createWorkspaceViaRpc,
  getWorkspaceById,
  listWorkspaceMembers,
  listWorkspacesForCurrentUser,
  type Workspace,
  type WorkspaceMember,
} from "./repository";

function fakeClient(builder: {
  select?: unknown;
  order?: unknown;
  rpc?: unknown;
}) {
  const orderMock = vi.fn().mockResolvedValue(builder.order);
  const selectMock = vi.fn(() => ({ order: orderMock }));
  const fromMock = vi.fn(() => ({ select: selectMock }));
  const rpcMock = vi.fn().mockResolvedValue(builder.rpc);
  return {
    from: fromMock,
    rpc: rpcMock,
    _spies: { fromMock, selectMock, orderMock, rpcMock },
  };
}

const row: Workspace = {
  id: "w-1",
  name: "Acme",
  slug: "acme-ab12cd",
  workspace_type: "organization",
  plan: "free",
  owner_user_id: "u-1",
  country_code: null,
  profile_completion: 0,
  created_at: "2026-09-11T00:00:00Z",
  updated_at: "2026-09-11T00:00:00Z",
};

describe("listWorkspacesForCurrentUser", () => {
  it("returns rows ordered oldest-first when supabase resolves cleanly", async () => {
    const client = fakeClient({
      order: { data: [row], error: null },
    });
    const rows = await listWorkspacesForCurrentUser(
      client as unknown as Parameters<typeof listWorkspacesForCurrentUser>[0],
    );
    expect(rows).toEqual([row]);
    expect(client._spies.fromMock).toHaveBeenCalledWith("workspaces");
    expect(client._spies.orderMock).toHaveBeenCalledWith("created_at", {
      ascending: true,
    });
  });

  it("returns [] when supabase returns null data", async () => {
    const client = fakeClient({ order: { data: null, error: null } });
    await expect(
      listWorkspacesForCurrentUser(
        client as unknown as Parameters<typeof listWorkspacesForCurrentUser>[0],
      ),
    ).resolves.toEqual([]);
  });

  it("throws the supabase error when the query fails", async () => {
    const client = fakeClient({
      order: { data: null, error: { message: "boom" } },
    });
    await expect(
      listWorkspacesForCurrentUser(
        client as unknown as Parameters<typeof listWorkspacesForCurrentUser>[0],
      ),
    ).rejects.toThrow(/boom/);
  });
});

describe("createWorkspaceViaRpc", () => {
  it("returns the new workspace id when the rpc succeeds", async () => {
    const client = fakeClient({ rpc: { data: "w-new", error: null } });
    const id = await createWorkspaceViaRpc(
      client as unknown as Parameters<typeof createWorkspaceViaRpc>[0],
      { name: "Acme", type: "organization" },
    );
    expect(id).toBe("w-new");
    expect(client._spies.rpcMock).toHaveBeenCalledWith("create_workspace", {
      p_name: "Acme",
      p_workspace_type: "organization",
    });
  });

  it("throws the supabase error when the rpc fails", async () => {
    const client = fakeClient({
      rpc: { data: null, error: { message: "not authenticated" } },
    });
    await expect(
      createWorkspaceViaRpc(
        client as unknown as Parameters<typeof createWorkspaceViaRpc>[0],
        { name: "Acme", type: "organization" },
      ),
    ).rejects.toThrow(/not authenticated/);
  });
});

describe("getWorkspaceById", () => {
  function withMaybeSingle(finalValue: unknown) {
    const maybeSingleMock = vi.fn().mockResolvedValue(finalValue);
    const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    const fromMock = vi.fn(() => ({ select: selectMock }));
    return { from: fromMock, _spies: { fromMock, selectMock, eqMock } };
  }

  it("returns the workspace when found", async () => {
    const w: Workspace = {
      id: "w-1",
      name: "Acme",
      slug: "acme-ab12cd",
      workspace_type: "organization",
      plan: "free",
      owner_user_id: "u-1",
      country_code: null,
      profile_completion: 0,
      created_at: "2026-09-11T00:00:00Z",
      updated_at: "2026-09-11T00:00:00Z",
    };
    const client = withMaybeSingle({ data: w, error: null });
    const result = await getWorkspaceById(
      client as unknown as Parameters<typeof getWorkspaceById>[0],
      "w-1",
    );
    expect(result).toEqual(w);
    expect(client._spies.fromMock).toHaveBeenCalledWith("workspaces");
    expect(client._spies.eqMock).toHaveBeenCalledWith("id", "w-1");
  });

  it("returns null when the workspace is not found", async () => {
    const client = withMaybeSingle({ data: null, error: null });
    await expect(
      getWorkspaceById(
        client as unknown as Parameters<typeof getWorkspaceById>[0],
        "missing",
      ),
    ).resolves.toBeNull();
  });

  it("throws on supabase error", async () => {
    const client = withMaybeSingle({
      data: null,
      error: { message: "denied" },
    });
    await expect(
      getWorkspaceById(
        client as unknown as Parameters<typeof getWorkspaceById>[0],
        "w-1",
      ),
    ).rejects.toThrow(/denied/);
  });
});

describe("listWorkspaceMembers", () => {
  function withOrder(finalValue: unknown) {
    const orderMock = vi.fn().mockResolvedValue(finalValue);
    const eqMock = vi.fn(() => ({ order: orderMock }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    const fromMock = vi.fn(() => ({ select: selectMock }));
    return { from: fromMock, _spies: { fromMock, selectMock, eqMock, orderMock } };
  }

  const member: WorkspaceMember = {
    id: "m-1",
    workspace_id: "w-1",
    user_id: "u-1",
    role: "admin",
    status: "active",
    joined_at: "2026-09-11T00:00:00Z",
    created_at: "2026-09-11T00:00:00Z",
  };

  it("filters by workspace_id and orders by joined_at asc", async () => {
    const client = withOrder({ data: [member], error: null });
    const rows = await listWorkspaceMembers(
      client as unknown as Parameters<typeof listWorkspaceMembers>[0],
      "w-1",
    );
    expect(rows).toEqual([member]);
    expect(client._spies.fromMock).toHaveBeenCalledWith("workspace_members");
    expect(client._spies.eqMock).toHaveBeenCalledWith("workspace_id", "w-1");
    expect(client._spies.orderMock).toHaveBeenCalledWith("joined_at", {
      ascending: true,
      nullsFirst: false,
    });
  });

  it("returns [] on null data", async () => {
    const client = withOrder({ data: null, error: null });
    await expect(
      listWorkspaceMembers(
        client as unknown as Parameters<typeof listWorkspaceMembers>[0],
        "w-1",
      ),
    ).resolves.toEqual([]);
  });
});
