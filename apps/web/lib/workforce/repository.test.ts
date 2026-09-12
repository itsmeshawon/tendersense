import { describe, expect, it, vi } from "vitest";
import {
  getWorkforce,
  upsertWorkforce,
  type WorkforceRow,
} from "./repository";

const sample: WorkforceRow = {
  workspace_id: "ws-1",
  total_employees: 320,
  role_counts: { engineers: 200, project_managers: 25 },
  updated_by: "u-1",
  updated_at: "2026-09-13T00:00:00Z",
};

function fakeSelect(v: unknown) {
  const single = vi.fn().mockResolvedValue(v);
  const eq = vi.fn(() => ({ maybeSingle: single }));
  const select = vi.fn(() => ({ eq }));
  return { from: vi.fn(() => ({ select })), _spies: { select, eq, single } };
}

function fakeUpsert(v: unknown) {
  const single = vi.fn().mockResolvedValue(v);
  const select = vi.fn(() => ({ single }));
  const upsert = vi.fn(() => ({ select }));
  return { from: vi.fn(() => ({ upsert })), _spies: { upsert, select, single } };
}

describe("getWorkforce", () => {
  it("returns the single row if present", async () => {
    const c = fakeSelect({ data: sample, error: null });
    const r = await getWorkforce(
      c as unknown as Parameters<typeof getWorkforce>[0],
      "ws-1",
    );
    expect(r).toEqual(sample);
  });

  it("returns null when no row", async () => {
    const c = fakeSelect({ data: null, error: null });
    const r = await getWorkforce(
      c as unknown as Parameters<typeof getWorkforce>[0],
      "ws-1",
    );
    expect(r).toBeNull();
  });
});

describe("upsertWorkforce", () => {
  it("upserts by workspace_id", async () => {
    const c = fakeUpsert({ data: sample, error: null });
    const r = await upsertWorkforce(
      c as unknown as Parameters<typeof upsertWorkforce>[0],
      "ws-1",
      "u-1",
      { totalEmployees: 320, roleCounts: { engineers: 200 } },
    );
    expect(r).toEqual(sample);
    expect(c._spies.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: "ws-1",
        total_employees: 320,
        role_counts: { engineers: 200 },
      }),
      expect.objectContaining({ onConflict: "workspace_id" }),
    );
  });
});
