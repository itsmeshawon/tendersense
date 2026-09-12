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

/**
 * Fake Supabase client that supports the whole filter chain:
 * from → select → eq/not/gte/lte (chained) → order → limit.
 * Each spy records its arguments so tests can assert on them.
 */
function fakeClient(finalValue: unknown) {
  const limitMock = vi.fn().mockResolvedValue(finalValue);

  // Chain returned by every filter method — allows further chaining.
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    eq: vi.fn(),
    not: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    textSearch: vi.fn(),
    order: vi.fn(),
    limit: limitMock,
  };
  // All builder methods return the same chain so calls compose.
  for (const key of ["eq", "not", "gte", "lte", "textSearch", "order"]) {
    chain[key].mockReturnValue(chain);
  }

  const selectMock = vi.fn(() => chain);
  const fromMock = vi.fn(() => ({ select: selectMock }));
  return {
    from: fromMock,
    _spies: {
      fromMock,
      selectMock,
      eq: chain.eq,
      not: chain.not,
      gte: chain.gte,
      lte: chain.lte,
      textSearch: chain.textSearch,
      orderMock: chain.order,
      limitMock,
    },
  };
}

describe("listOpportunities — defaults", () => {
  it("queries opportunities ordered by publication_at desc with default limit 50", async () => {
    const client = fakeClient({ data: [row], error: null });
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
    // No filter methods called
    expect(client._spies.eq).not.toHaveBeenCalled();
    expect(client._spies.not).not.toHaveBeenCalled();
  });

  it("respects a custom limit", async () => {
    const client = fakeClient({ data: [row], error: null });
    await listOpportunities(
      client as unknown as Parameters<typeof listOpportunities>[0],
      { limit: 10 },
    );
    expect(client._spies.limitMock).toHaveBeenCalledWith(10);
  });

  it("clamps limit at 200", async () => {
    const client = fakeClient({ data: [], error: null });
    await listOpportunities(
      client as unknown as Parameters<typeof listOpportunities>[0],
      { limit: 500 },
    );
    expect(client._spies.limitMock).toHaveBeenCalledWith(200);
  });

  it("returns [] when supabase returns null data", async () => {
    const client = fakeClient({ data: null, error: null });
    await expect(
      listOpportunities(
        client as unknown as Parameters<typeof listOpportunities>[0],
      ),
    ).resolves.toEqual([]);
  });

  it("throws when supabase returns an error", async () => {
    const client = fakeClient({
      data: null,
      error: { message: "boom" },
    });
    await expect(
      listOpportunities(
        client as unknown as Parameters<typeof listOpportunities>[0],
      ),
    ).rejects.toThrow(/boom/);
  });
});

describe("listOpportunities — filters", () => {
  it("applies country filter with an eq on country_code", async () => {
    const client = fakeClient({ data: [], error: null });
    await listOpportunities(
      client as unknown as Parameters<typeof listOpportunities>[0],
      { country: "BD" },
    );
    expect(client._spies.eq).toHaveBeenCalledWith("country_code", "BD");
  });

  it("applies source filter with an eq on source_key", async () => {
    const client = fakeClient({ data: [], error: null });
    await listOpportunities(
      client as unknown as Parameters<typeof listOpportunities>[0],
      { source: "world_bank" },
    );
    expect(client._spies.eq).toHaveBeenCalledWith("source_key", "world_bank");
  });

  it("applies status filter with an eq on status", async () => {
    const client = fakeClient({ data: [], error: null });
    await listOpportunities(
      client as unknown as Parameters<typeof listOpportunities>[0],
      { status: "open" },
    );
    expect(client._spies.eq).toHaveBeenCalledWith("status", "open");
  });

  it("applies deadlineWithinDays with not-null + gte(now) + lte(now+N)", async () => {
    const client = fakeClient({ data: [], error: null });
    await listOpportunities(
      client as unknown as Parameters<typeof listOpportunities>[0],
      { deadlineWithinDays: 30 },
    );
    expect(client._spies.not).toHaveBeenCalledWith(
      "deadline_at",
      "is",
      null,
    );
    // gte + lte were called once each on deadline_at
    expect(client._spies.gte).toHaveBeenCalledTimes(1);
    expect(client._spies.gte.mock.calls[0][0]).toBe("deadline_at");
    expect(client._spies.lte).toHaveBeenCalledTimes(1);
    expect(client._spies.lte.mock.calls[0][0]).toBe("deadline_at");
    // Sanity: the upper bound is roughly 30 days after the lower bound
    const lower = new Date(String(client._spies.gte.mock.calls[0][1])).getTime();
    const upper = new Date(String(client._spies.lte.mock.calls[0][1])).getTime();
    const diffDays = Math.round((upper - lower) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(30);
  });

  it("applies text search via .textSearch on search_text with websearch/simple", async () => {
    const client = fakeClient({ data: [], error: null });
    await listOpportunities(
      client as unknown as Parameters<typeof listOpportunities>[0],
      { q: "ERP implementation" },
    );
    // Config must match migration 0009's 'simple' tsvector trigger.
    expect(client._spies.textSearch).toHaveBeenCalledWith(
      "search_text",
      "ERP implementation",
      { type: "websearch", config: "simple" },
    );
  });

  it("skips text search when q is only whitespace", async () => {
    const client = fakeClient({ data: [], error: null });
    await listOpportunities(
      client as unknown as Parameters<typeof listOpportunities>[0],
      { q: "   " },
    );
    expect(client._spies.textSearch).not.toHaveBeenCalled();
  });

  it("combines source + country + status + deadline in one query", async () => {
    const client = fakeClient({ data: [], error: null });
    await listOpportunities(
      client as unknown as Parameters<typeof listOpportunities>[0],
      {
        source: "bd_egp",
        country: "BD",
        status: "open",
        deadlineWithinDays: 7,
      },
    );
    // Three eq() calls: country, source, status (in the order the
    // function invokes them — country, source, status)
    expect(client._spies.eq).toHaveBeenCalledTimes(3);
    expect(client._spies.not).toHaveBeenCalledTimes(1);
    expect(client._spies.gte).toHaveBeenCalledTimes(1);
    expect(client._spies.lte).toHaveBeenCalledTimes(1);
    expect(client._spies.orderMock).toHaveBeenCalledTimes(1);
    expect(client._spies.limitMock).toHaveBeenCalledTimes(1);
  });
});

describe("listOpportunities — sort", () => {
  it("defaults to publication_at desc", async () => {
    const client = fakeClient({ data: [], error: null });
    await listOpportunities(
      client as unknown as Parameters<typeof listOpportunities>[0],
    );
    expect(client._spies.orderMock).toHaveBeenCalledWith("publication_at", {
      ascending: false,
      nullsFirst: false,
    });
  });

  it("sort=deadline_asc orders by deadline_at asc with nulls last", async () => {
    const client = fakeClient({ data: [], error: null });
    await listOpportunities(
      client as unknown as Parameters<typeof listOpportunities>[0],
      { sort: "deadline_asc" },
    );
    expect(client._spies.orderMock).toHaveBeenCalledWith("deadline_at", {
      ascending: true,
      nullsFirst: false,
    });
  });

  it("sort=value_desc orders by estimated_value_max desc with nulls last", async () => {
    const client = fakeClient({ data: [], error: null });
    await listOpportunities(
      client as unknown as Parameters<typeof listOpportunities>[0],
      { sort: "value_desc" },
    );
    expect(client._spies.orderMock).toHaveBeenCalledWith(
      "estimated_value_max",
      { ascending: false, nullsFirst: false },
    );
  });

  it("sort=relevance without q falls back to publication_at desc", async () => {
    const client = fakeClient({ data: [], error: null });
    await listOpportunities(
      client as unknown as Parameters<typeof listOpportunities>[0],
      { sort: "relevance" },
    );
    expect(client._spies.orderMock).toHaveBeenCalledWith("publication_at", {
      ascending: false,
      nullsFirst: false,
    });
    expect(client._spies.textSearch).not.toHaveBeenCalled();
  });

  it("sort=relevance with q applies textSearch and orders by publication_at desc", async () => {
    const client = fakeClient({ data: [], error: null });
    await listOpportunities(
      client as unknown as Parameters<typeof listOpportunities>[0],
      { sort: "relevance", q: "erp" },
    );
    expect(client._spies.textSearch).toHaveBeenCalledTimes(1);
    // Relevance ordering falls back to publication_desc secondary until
    // an RPC exposes ts_rank explicitly (documented in repository.ts).
    expect(client._spies.orderMock).toHaveBeenCalledWith("publication_at", {
      ascending: false,
      nullsFirst: false,
    });
  });
});
