import { describe, expect, it, vi } from "vitest";

// next/headers::cookies() is a server-only import that vitest can't
// resolve unless we stub it. The stub lets us assert priority order.
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "ts_workspace" ? { value: "ws-cookie" } : undefined,
  }),
}));

import { resolveActiveWorkspaceId } from "./context";

const list = [
  { id: "ws-first", name: "First" },
  { id: "ws-cookie", name: "Cookie" },
  { id: "ws-other", name: "Other" },
];

describe("resolveActiveWorkspaceId", () => {
  it("returns undefined when the workspace list is empty", async () => {
    const r = await resolveActiveWorkspaceId({ workspaces: [] });
    expect(r).toBeUndefined();
  });

  it("prefers ?workspace= when it matches a member workspace", async () => {
    const r = await resolveActiveWorkspaceId({
      workspaces: list,
      requestedId: "ws-other",
    });
    expect(r?.id).toBe("ws-other");
  });

  it("falls back to the cookie when the query param is missing", async () => {
    const r = await resolveActiveWorkspaceId({ workspaces: list });
    expect(r?.id).toBe("ws-cookie");
  });

  it("falls back to first when neither param nor cookie matches", async () => {
    const r = await resolveActiveWorkspaceId({
      workspaces: [{ id: "ws-first", name: "First" }],
      requestedId: "not-a-member",
    });
    expect(r?.id).toBe("ws-first");
  });
});
