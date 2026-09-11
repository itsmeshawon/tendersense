import { beforeEach, describe, expect, it, vi } from "vitest";

describe("createServiceRoleClient", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54331";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
  });

  it("returns a client with from() when called on the server", async () => {
    const { createServiceRoleClient } = await import("./service");
    const client = createServiceRoleClient();
    expect(client).toBeDefined();
    expect(typeof client.from).toBe("function");
  });

  it("throws if imported in a browser-like environment", async () => {
    // Simulate a browser by defining `window` on globalThis.
    // The guard should fire on the first call.
    (globalThis as unknown as { window: object }).window = {};
    try {
      const { createServiceRoleClient } = await import("./service");
      expect(() => createServiceRoleClient()).toThrow(/server-only/i);
    } finally {
      delete (globalThis as { window?: unknown }).window;
    }
  });
});
