import { describe, expect, it, vi } from "vitest";
import {
  listFinancials,
  upsertFinancial,
  deleteFinancial,
  type FinancialRow,
} from "./repository";

const sample: FinancialRow = {
  id: "f-1",
  workspace_id: "ws-1",
  fiscal_year: 2025,
  currency: "USD",
  annual_turnover: 25000000,
  net_worth: null,
  liquid_assets: null,
  largest_contract_value: null,
  is_audited: true,
  evidence_document_id: null,
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

function fakeUpsert(v: unknown) {
  const single = vi.fn().mockResolvedValue(v);
  const select = vi.fn(() => ({ single }));
  const upsert = vi.fn(() => ({ select }));
  return { from: vi.fn(() => ({ upsert })), _spies: { upsert, select, single } };
}

function fakeDelete(v: unknown) {
  const eq = vi.fn().mockResolvedValue(v);
  const del = vi.fn(() => ({ eq }));
  return { from: vi.fn(() => ({ delete: del })), _spies: { del, eq } };
}

describe("listFinancials", () => {
  it("filters by workspace, orders by fiscal_year desc", async () => {
    const c = fakeSelect({ data: [sample], error: null });
    const rows = await listFinancials(
      c as unknown as Parameters<typeof listFinancials>[0],
      "ws-1",
    );
    expect(rows).toEqual([sample]);
    expect(c._spies.eq).toHaveBeenCalledWith("workspace_id", "ws-1");
    expect(c._spies.order).toHaveBeenCalledWith("fiscal_year", {
      ascending: false,
    });
  });
});

describe("upsertFinancial", () => {
  it("upserts by (workspace_id, fiscal_year)", async () => {
    const c = fakeUpsert({ data: sample, error: null });
    const r = await upsertFinancial(
      c as unknown as Parameters<typeof upsertFinancial>[0],
      {
        workspaceId: "ws-1",
        createdBy: "u-1",
        fiscalYear: 2025,
        currency: "USD",
        annualTurnover: 25000000,
        isAudited: true,
      },
    );
    expect(r).toEqual(sample);
    expect(c._spies.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: "ws-1",
        fiscal_year: 2025,
        currency: "USD",
        annual_turnover: 25000000,
      }),
      expect.objectContaining({ onConflict: "workspace_id,fiscal_year" }),
    );
  });
});

describe("deleteFinancial", () => {
  it("deletes by id", async () => {
    const c = fakeDelete({ error: null });
    await deleteFinancial(
      c as unknown as Parameters<typeof deleteFinancial>[0],
      "f-1",
    );
    expect(c._spies.eq).toHaveBeenCalledWith("id", "f-1");
  });
});
