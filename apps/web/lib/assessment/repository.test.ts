import { describe, expect, it, vi } from "vitest";
import {
  createManualRequirement,
  deleteRequirement,
  listRequirements,
  updateRequirement,
  updateExtractionMethod,
  type RequirementRow,
} from "./repository";

const sample: RequirementRow = {
  id: "r-1",
  assessment_id: "a-1",
  category: "certification",
  text: "ISO 27001 required",
  normalized_key: "iso_27001",
  mandatory: true,
  threshold: null,
  source_location: null,
  confidence: 1,
  source: "manual",
  created_at: "2026-09-13T00:00:00Z",
};

function fakeList(rows: unknown) {
  const order = vi.fn().mockResolvedValue({ data: rows, error: null });
  const eq = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ eq }));
  return { from: vi.fn(() => ({ select })), _spies: { select, eq, order } };
}

function fakeInsert(row: unknown) {
  const single = vi.fn().mockResolvedValue({ data: row, error: null });
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));
  return { from: vi.fn(() => ({ insert })), _spies: { insert, select, single } };
}

function fakeUpdate(row: unknown) {
  const single = vi.fn().mockResolvedValue({ data: row, error: null });
  const select = vi.fn(() => ({ single }));
  const eq = vi.fn(() => ({ select }));
  const update = vi.fn(() => ({ eq }));
  return { from: vi.fn(() => ({ update })), _spies: { update, eq, select, single } };
}

function fakeDelete() {
  const eq = vi.fn().mockResolvedValue({ data: null, error: null });
  const del = vi.fn(() => ({ eq }));
  return { from: vi.fn(() => ({ delete: del })), _spies: { delete: del, eq } };
}

describe("listRequirements", () => {
  it("returns rows for an assessment", async () => {
    const c = fakeList([sample]);
    const rows = await listRequirements(
      c as unknown as Parameters<typeof listRequirements>[0],
      "a-1",
    );
    expect(rows).toEqual([sample]);
    expect(c._spies.eq).toHaveBeenCalledWith("assessment_id", "a-1");
  });

  it("returns empty when null", async () => {
    const c = fakeList(null);
    const rows = await listRequirements(
      c as unknown as Parameters<typeof listRequirements>[0],
      "a-1",
    );
    expect(rows).toEqual([]);
  });
});

describe("createManualRequirement", () => {
  it("inserts with source='manual'", async () => {
    const c = fakeInsert(sample);
    const r = await createManualRequirement(
      c as unknown as Parameters<typeof createManualRequirement>[0],
      {
        assessmentId: "a-1",
        category: "certification",
        text: "ISO 27001 required",
        normalizedKey: "iso_27001",
        mandatory: true,
      },
    );
    expect(r).toEqual(sample);
    expect(c._spies.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        assessment_id: "a-1",
        category: "certification",
        text: "ISO 27001 required",
        normalized_key: "iso_27001",
        mandatory: true,
        source: "manual",
      }),
    );
  });
});

describe("updateRequirement", () => {
  it("patches allowed fields", async () => {
    const c = fakeUpdate({ ...sample, mandatory: false });
    await updateRequirement(
      c as unknown as Parameters<typeof updateRequirement>[0],
      "r-1",
      { mandatory: false, text: "updated" },
    );
    expect(c._spies.update).toHaveBeenCalledWith(
      expect.objectContaining({ mandatory: false, text: "updated" }),
    );
    expect(c._spies.eq).toHaveBeenCalledWith("id", "r-1");
  });
});

describe("deleteRequirement", () => {
  it("deletes by id", async () => {
    const c = fakeDelete();
    await deleteRequirement(
      c as unknown as Parameters<typeof deleteRequirement>[0],
      "r-1",
    );
    expect(c._spies.eq).toHaveBeenCalledWith("id", "r-1");
  });
});

describe("updateExtractionMethod", () => {
  it("updates assessments.extraction_method by id", async () => {
    const c = fakeUpdate({ id: "a-1", extraction_method: "mixed" });
    await updateExtractionMethod(
      c as unknown as Parameters<typeof updateExtractionMethod>[0],
      "a-1",
      "mixed",
    );
    expect(c.from).toHaveBeenCalledWith("assessments");
    expect(c._spies.update).toHaveBeenCalledWith(
      expect.objectContaining({ extraction_method: "mixed" }),
    );
    expect(c._spies.eq).toHaveBeenCalledWith("id", "a-1");
  });
});
