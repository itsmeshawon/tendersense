import { describe, expect, it, vi } from "vitest";
import {
  countUnreadForBell,
  listBellNotifications,
  listNotifications,
  markAllReadForWorkspace,
  markNotificationRead,
  type NotificationRow,
} from "./repository";

const sample: NotificationRow = {
  id: "n-1",
  workspace_id: "ws-1",
  user_id: null,
  kind: "amendment",
  opportunity_id: "op-1",
  revision_id: "r-1",
  title: "Deadline changed",
  body: "The tender deadline was extended by 5 days.",
  metadata: {},
  read_at: null,
  created_at: "2026-09-12T00:00:00Z",
};

function fakeSelectChain(finalValue: unknown) {
  const limitMock = vi.fn().mockResolvedValue(finalValue);
  const orderMock = vi.fn(() => ({ limit: limitMock }));
  const isMock = vi.fn(() => ({ order: orderMock }));
  const gteMock = vi.fn(() => ({
    order: orderMock,
    is: isMock,
    then: (r: (v: unknown) => void) => Promise.resolve(finalValue).then(r),
  }));
  const eqMock = vi.fn(() => ({
    order: orderMock,
    gte: gteMock,
    is: isMock,
  }));
  const selectMock = vi.fn(() => ({ eq: eqMock }));
  return {
    from: vi.fn(() => ({ select: selectMock })),
    _spies: { selectMock, eqMock, gteMock, isMock, orderMock, limitMock },
  };
}

function fakeCountChain(count: number) {
  const isMock = vi.fn().mockResolvedValue({
    data: null,
    error: null,
    count,
  });
  const gteMock = vi.fn(() => ({ is: isMock }));
  const eqMock = vi.fn(() => ({ gte: gteMock }));
  const selectMock = vi.fn(() => ({ eq: eqMock }));
  return {
    from: vi.fn(() => ({ select: selectMock })),
    _spies: { selectMock, eqMock, gteMock, isMock },
  };
}

function fakeUpdateChain(finalValue: unknown) {
  const isMock = vi.fn().mockResolvedValue(finalValue);
  const eqMock = vi.fn(() => ({
    is: isMock,
    then: (r: (v: unknown) => void) => Promise.resolve(finalValue).then(r),
  }));
  const updateMock = vi.fn(() => ({ eq: eqMock, is: isMock }));
  return {
    from: vi.fn(() => ({ update: updateMock })),
    _spies: { updateMock, eqMock, isMock },
  };
}

describe("listNotifications", () => {
  it("filters by workspace_id, orders by created_at desc, limits", async () => {
    const client = fakeSelectChain({ data: [sample], error: null });
    const rows = await listNotifications(
      client as unknown as Parameters<typeof listNotifications>[0],
      "ws-1",
      50,
    );
    expect(rows).toEqual([sample]);
    expect(client._spies.eqMock).toHaveBeenCalledWith("workspace_id", "ws-1");
    expect(client._spies.orderMock).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
    expect(client._spies.limitMock).toHaveBeenCalledWith(50);
  });
});

describe("listBellNotifications", () => {
  it("filters by workspace_id + last 30 days + orders by created_at desc", async () => {
    const client = fakeSelectChain({ data: [sample], error: null });
    await listBellNotifications(
      client as unknown as Parameters<typeof listBellNotifications>[0],
      "ws-1",
    );
    expect(client._spies.eqMock).toHaveBeenCalledWith("workspace_id", "ws-1");
    expect(client._spies.gteMock).toHaveBeenCalledWith(
      "created_at",
      expect.stringMatching(/T.*Z$/),
    );
  });
});

describe("countUnreadForBell", () => {
  it("returns the head count for unread notifications in last 30d", async () => {
    const client = fakeCountChain(3);
    const n = await countUnreadForBell(
      client as unknown as Parameters<typeof countUnreadForBell>[0],
      "ws-1",
    );
    expect(n).toBe(3);
    expect(client._spies.eqMock).toHaveBeenCalledWith("workspace_id", "ws-1");
    expect(client._spies.isMock).toHaveBeenCalledWith("read_at", null);
  });

  it("returns 0 when count is null", async () => {
    const client = fakeCountChain(0);
    const n = await countUnreadForBell(
      client as unknown as Parameters<typeof countUnreadForBell>[0],
      "ws-1",
    );
    expect(n).toBe(0);
  });
});

describe("markNotificationRead", () => {
  it("sets read_at to now for a specific notification", async () => {
    const client = fakeUpdateChain({ error: null });
    await markNotificationRead(
      client as unknown as Parameters<typeof markNotificationRead>[0],
      "n-1",
    );
    expect(client._spies.updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ read_at: expect.any(String) }),
    );
    expect(client._spies.eqMock).toHaveBeenCalledWith("id", "n-1");
  });
});

describe("markAllReadForWorkspace", () => {
  it("updates unread notifications only", async () => {
    const client = fakeUpdateChain({ error: null });
    await markAllReadForWorkspace(
      client as unknown as Parameters<typeof markAllReadForWorkspace>[0],
      "ws-1",
    );
    expect(client._spies.updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ read_at: expect.any(String) }),
    );
    expect(client._spies.eqMock).toHaveBeenCalledWith("workspace_id", "ws-1");
    expect(client._spies.isMock).toHaveBeenCalledWith("read_at", null);
  });
});
