import { beforeEach, describe, expect, it } from "vitest";
import { createBrowserSupabaseClient } from "./client";

describe("createBrowserSupabaseClient", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54331";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  });

  it("returns a client with auth + from() capabilities", () => {
    const client = createBrowserSupabaseClient();
    expect(client).toBeDefined();
    expect(typeof client.auth.getSession).toBe("function");
    expect(typeof client.from).toBe("function");
  });
});
