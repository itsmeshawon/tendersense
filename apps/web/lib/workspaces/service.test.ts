import { beforeEach, describe, expect, it, vi } from "vitest";

const createRpc = vi.fn();
const listRepo = vi.fn();

vi.mock("./repository", () => ({
  listWorkspacesForCurrentUser: (...args: unknown[]) => listRepo(...args),
  createWorkspaceViaRpc: (...args: unknown[]) => createRpc(...args),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => {} }),
}));

vi.mock("../supabase/server", () => ({
  createServerSupabaseClient: async () => ({ __fake: true }),
}));

import { createMyWorkspace, listMyWorkspaces } from "./service";

describe("listMyWorkspaces", () => {
  beforeEach(() => {
    listRepo.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54331";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  });

  it("delegates to the repository with the server client", async () => {
    listRepo.mockResolvedValue([]);
    await expect(listMyWorkspaces()).resolves.toEqual([]);
    expect(listRepo).toHaveBeenCalledTimes(1);
  });
});

describe("createMyWorkspace", () => {
  beforeEach(() => {
    createRpc.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54331";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  });

  it("returns the new id when input is valid", async () => {
    createRpc.mockResolvedValue("w-new");
    const result = await createMyWorkspace({
      name: "Acme",
      type: "organization",
    });
    expect(result).toEqual({ ok: true, id: "w-new" });
    expect(createRpc).toHaveBeenCalledWith(
      { __fake: true },
      { name: "Acme", type: "organization" },
    );
  });

  it("trims the name before persisting", async () => {
    createRpc.mockResolvedValue("w-new");
    await createMyWorkspace({ name: "  Acme  ", type: "individual" });
    expect(createRpc).toHaveBeenCalledWith(expect.anything(), {
      name: "Acme",
      type: "individual",
    });
  });

  it("rejects an empty name", async () => {
    const result = await createMyWorkspace({ name: "  ", type: "individual" });
    expect(result).toMatchObject({ ok: false });
    expect(createRpc).not.toHaveBeenCalled();
  });

  it("rejects a name longer than 80 chars", async () => {
    const result = await createMyWorkspace({
      name: "a".repeat(81),
      type: "individual",
    });
    expect(result).toMatchObject({ ok: false });
    expect(createRpc).not.toHaveBeenCalled();
  });

  it("rejects an unknown workspace type", async () => {
    const result = await createMyWorkspace({
      name: "Acme",
      // deliberately invalid
      type: "other" as unknown as "individual",
    });
    expect(result).toMatchObject({ ok: false });
    expect(createRpc).not.toHaveBeenCalled();
  });

  it("bubbles a friendly error when the rpc rejects", async () => {
    createRpc.mockRejectedValue(new Error("not authenticated"));
    const result = await createMyWorkspace({
      name: "Acme",
      type: "individual",
    });
    expect(result).toMatchObject({ ok: false });
  });
});
