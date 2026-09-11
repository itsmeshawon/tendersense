import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => [] as Array<{ name: string; value: string }>,
    set: () => {},
  }),
}));

import { createServerSupabaseClient } from "./server";

describe("createServerSupabaseClient", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54331";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  });

  it("returns a client bound to cookies with auth + from()", async () => {
    const client = await createServerSupabaseClient();
    expect(client).toBeDefined();
    expect(typeof client.auth.getUser).toBe("function");
    expect(typeof client.from).toBe("function");
  });
});
