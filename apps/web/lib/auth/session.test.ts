import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => {} }),
}));

vi.mock("../supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    auth: { getUser: getUserMock },
  }),
}));

import { getServerUser } from "./session";

describe("getServerUser", () => {
  beforeEach(() => {
    getUserMock.mockReset();
  });

  it("returns the user object when authenticated", async () => {
    const user = { id: "u-1", email: "a@example.com" };
    getUserMock.mockResolvedValue({ data: { user }, error: null });
    await expect(getServerUser()).resolves.toEqual(user);
  });

  it("returns null when the client reports no user", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });
    await expect(getServerUser()).resolves.toBeNull();
  });

  it("returns null when the client returns an auth error", async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: { message: "no session" },
    });
    await expect(getServerUser()).resolves.toBeNull();
  });
});
