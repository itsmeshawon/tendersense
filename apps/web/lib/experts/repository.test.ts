import { describe, expect, it, vi } from "vitest";
import {
  listExperts,
  createExpert,
  deleteExpert,
  type ExpertRow,
} from "./repository";

const sample: ExpertRow = {
  id: "e-1",
  workspace_id: "ws-1",
  name: "Dr. Rahim Karim",
  role: "ERP Lead",
  years_experience: 15,
  sectors: ["Banking", "Government"],
  availability: "part_time",
  cv_document_id: null,
  created_by: "u-1",
  created_at: "2026-09-13T00:00:00Z",
  updated_at: "2026-09-13T00:00:00Z",
};

function fakeSelect(v: unknown) {
  const order = vi.fn().mockResolvedValue(v);
  const eq = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ eq }));
  return { from: vi.fn(() => ({ select })), _spies: { select, eq, order } };
}

function fakeInsert(v: unknown) {
  const single = vi.fn().mockResolvedValue(v);
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));
  return { from: vi.fn(() => ({ insert })), _spies: { insert } };
}

function fakeDelete(v: unknown) {
  const eq = vi.fn().mockResolvedValue(v);
  const del = vi.fn(() => ({ eq }));
  return { from: vi.fn(() => ({ delete: del })), _spies: { del, eq } };
}

describe("listExperts", () => {
  it("returns experts for a workspace", async () => {
    const c = fakeSelect({ data: [sample], error: null });
    const r = await listExperts(
      c as unknown as Parameters<typeof listExperts>[0],
      "ws-1",
    );
    expect(r).toEqual([sample]);
  });
});

describe("createExpert", () => {
  it("inserts with name + sectors array", async () => {
    const c = fakeInsert({ data: sample, error: null });
    const r = await createExpert(
      c as unknown as Parameters<typeof createExpert>[0],
      {
        workspaceId: "ws-1",
        createdBy: "u-1",
        name: "Dr. Rahim Karim",
        role: "ERP Lead",
        yearsExperience: 15,
        sectors: ["Banking", "Government"],
        availability: "part_time",
      },
    );
    expect(r).toEqual(sample);
    expect(c._spies.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: "ws-1",
        name: "Dr. Rahim Karim",
        sectors: ["Banking", "Government"],
      }),
    );
  });
});

describe("deleteExpert", () => {
  it("deletes by id", async () => {
    const c = fakeDelete({ error: null });
    await deleteExpert(
      c as unknown as Parameters<typeof deleteExpert>[0],
      "e-1",
    );
    expect(c._spies.eq).toHaveBeenCalledWith("id", "e-1");
  });
});
