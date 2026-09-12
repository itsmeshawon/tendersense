import { describe, expect, it, vi } from "vitest";
import {
  listOpportunities,
  type Opportunity,
} from "./repository";

const row: Opportunity = {
  id: "op-1",
  source_key: "world_bank",
  external_id: "wb-42",
  source_url: "https://example.com/42",
  title: "Sample tender",
  description: null,
  notice_type: null,
  procurement_category: null,
  procurement_method: null,
  country_code: "BD",
  country_name: "Bangladesh",
  region: null,
  district: null,
  issuer_name: null,
  ministry_name: "Ministry of X",
  agency_name: null,
  procuring_entity_name: null,
  project_id: null,
  reference_no: null,
  sector: null,
  tags: null,
  publication_at: "2026-09-01T00:00:00Z",
  deadline_at: "2026-10-01T00:00:00Z",
  currency: "BDT",
  estimated_value_min: null,
  estimated_value_max: null,
  status: "open",
  language: null,
  content_hash: "hash",
  source_updated_at: null,
  first_seen_at: "2026-09-01T00:00:00Z",
  last_seen_at: "2026-09-01T00:00:00Z",
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

function fakeClient(builder: { limit?: unknown }) {
  const limitMock = vi.fn().mockResolvedValue(builder.limit);
  const orderMock = vi.fn(() => ({ limit: limitMock }));
  const selectMock = vi.fn(() => ({ order: orderMock }));
  const fromMock = vi.fn(() => ({ select: selectMock }));
  return {
    from: fromMock,
    _spies: { fromMock, selectMock, orderMock, limitMock },
  };
}

describe("listOpportunities", () => {
  it("queries public.opportunities ordered by publication_at desc with default limit 50", async () => {
    const client = fakeClient({ limit: { data: [row], error: null } });
    const rows = await listOpportunities(
      client as unknown as Parameters<typeof listOpportunities>[0],
    );
    expect(rows).toEqual([row]);
    expect(client._spies.fromMock).toHaveBeenCalledWith("opportunities");
    expect(client._spies.orderMock).toHaveBeenCalledWith("publication_at", {
      ascending: false,
      nullsFirst: false,
    });
    expect(client._spies.limitMock).toHaveBeenCalledWith(50);
  });

  it("respects a custom limit", async () => {
    const client = fakeClient({ limit: { data: [row], error: null } });
    await listOpportunities(
      client as unknown as Parameters<typeof listOpportunities>[0],
      { limit: 10 },
    );
    expect(client._spies.limitMock).toHaveBeenCalledWith(10);
  });

  it("clamps limit at 200", async () => {
    const client = fakeClient({ limit: { data: [], error: null } });
    await listOpportunities(
      client as unknown as Parameters<typeof listOpportunities>[0],
      { limit: 500 },
    );
    expect(client._spies.limitMock).toHaveBeenCalledWith(200);
  });

  it("returns [] when supabase returns null data", async () => {
    const client = fakeClient({ limit: { data: null, error: null } });
    await expect(
      listOpportunities(
        client as unknown as Parameters<typeof listOpportunities>[0],
      ),
    ).resolves.toEqual([]);
  });

  it("throws when supabase returns an error", async () => {
    const client = fakeClient({
      limit: { data: null, error: { message: "boom" } },
    });
    await expect(
      listOpportunities(
        client as unknown as Parameters<typeof listOpportunities>[0],
      ),
    ).rejects.toThrow(/boom/);
  });
});
