import { beforeEach, describe, expect, it, vi } from "vitest";

const listRepo = vi.fn();

vi.mock("./repository", () => ({
  listOpportunities: (...args: unknown[]) => listRepo(...args),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => {} }),
}));

vi.mock("../supabase/server", () => ({
  createServerSupabaseClient: async () => ({ __fake: true }),
}));

import { listPublicOpportunities } from "./service";

describe("listPublicOpportunities", () => {
  beforeEach(() => {
    listRepo.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54331";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  });

  it("delegates to the repository with the server client", async () => {
    listRepo.mockResolvedValue([]);
    await expect(listPublicOpportunities()).resolves.toEqual([]);
    expect(listRepo).toHaveBeenCalledTimes(1);
    expect(listRepo).toHaveBeenCalledWith({ __fake: true }, {});
  });

  it("passes through a limit override", async () => {
    listRepo.mockResolvedValue([]);
    await listPublicOpportunities({ limit: 10 });
    expect(listRepo).toHaveBeenCalledWith({ __fake: true }, { limit: 10 });
  });
});
