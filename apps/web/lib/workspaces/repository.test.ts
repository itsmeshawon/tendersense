import { describe, expect, it, vi } from "vitest";
import {
  createWorkspaceViaRpc,
  listWorkspacesForCurrentUser,
  type Workspace,
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
