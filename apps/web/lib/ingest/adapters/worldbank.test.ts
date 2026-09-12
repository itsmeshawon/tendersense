import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createWorldBankAdapter } from "./worldbank";

function fixture(name: string): string {
  return readFileSync(join(__dirname, "__fixtures__", name), "utf-8");
}

function jsonResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("createWorldBankAdapter — sourceKey + healthCheck", () => {
  it("exposes sourceKey world_bank", () => {
    const adapter = createWorldBankAdapter({ fetchImpl: vi.fn() });
    expect(adapter.sourceKey).toBe("world_bank");
  });

  it("healthCheck returns ok=true when API responds 200 with {count,data}", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(fixture("worldbank-empty.json")));
    const adapter = createWorldBankAdapter({ fetchImpl });
    const health = await adapter.healthCheck();
    expect(health.ok).toBe(true);
    expect(health.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("healthCheck returns ok=false on non-2xx", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse("nope", 503));
    const adapter = createWorldBankAdapter({ fetchImpl });
    const health = await adapter.healthCheck();
    expect(health.ok).toBe(false);
  });
});

describe("createWorldBankAdapter — fetchPage", () => {
  let fetchImpl: ReturnType<typeof vi.fn<typeof fetch>>;

  beforeEach(() => {
    fetchImpl = vi.fn<typeof fetch>();
  });

  it("issues a GET to the datacatalog URL with default top=1000 skip=0", async () => {
    fetchImpl.mockResolvedValue(jsonResponse(fixture("worldbank-page.json")));
    const adapter = createWorldBankAdapter({ fetchImpl });
    await adapter.fetchPage();
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toContain(
      "datacatalogapi.worldbank.org/dexapps/fone/api/apiservice",
    );
    expect(String(url)).toContain("datasetId=DS00979");
    expect(String(url)).toContain("resourceId=RS00909");
    expect(String(url)).toContain("type=json");
    expect(String(url)).toContain("top=1000");
    expect(String(url)).toContain("skip=0");
    expect(init?.method ?? "GET").toBe("GET");
  });

  it("respects the cursor's skip offset and returns records + nextCursor when the page is full", async () => {
    fetchImpl.mockResolvedValue(jsonResponse(fixture("worldbank-page.json")));
    // pageSize=2 matches the fixture record count, so the returned page is "full"
    // → adapter must set nextCursor and mark isLastPage=false
    const adapter = createWorldBankAdapter({
      fetchImpl,
      pageSize: 2,
    });
    const page = await adapter.fetchPage({ skip: 200 });
    expect(fetchImpl.mock.calls[0][0]).toContain("skip=200");
    expect(fetchImpl.mock.calls[0][0]).toContain("top=2");
    expect(page.records).toHaveLength(2);
    expect(page.isLastPage).toBe(false);
    expect(page.nextCursor).toEqual({ skip: 202 });
  });

  it("marks the page last when data length is less than pageSize", async () => {
    // pageSize=1000 default, fixture returns 2 rows
    fetchImpl.mockResolvedValue(jsonResponse(fixture("worldbank-page.json")));
    const adapter = createWorldBankAdapter({ fetchImpl });
    const page = await adapter.fetchPage();
    expect(page.isLastPage).toBe(true);
    expect(page.nextCursor).toBeUndefined();
  });

  it("handles empty data array as last page", async () => {
    fetchImpl.mockResolvedValue(jsonResponse(fixture("worldbank-empty.json")));
    const adapter = createWorldBankAdapter({ fetchImpl });
    const page = await adapter.fetchPage();
    expect(page.records).toEqual([]);
    expect(page.isLastPage).toBe(true);
  });

  it("sets a descriptive User-Agent", async () => {
    fetchImpl.mockResolvedValue(jsonResponse(fixture("worldbank-empty.json")));
    const adapter = createWorldBankAdapter({ fetchImpl });
    await adapter.fetchPage();
    const headers = new Headers(fetchImpl.mock.calls[0][1]?.headers);
    expect(headers.get("user-agent")).toContain("TenderSenseBot");
  });

  it("throws on non-2xx", async () => {
    fetchImpl.mockResolvedValue(jsonResponse("boom", 502));
    const adapter = createWorldBankAdapter({ fetchImpl });
    await expect(adapter.fetchPage()).rejects.toThrow(/502/);
  });
});

describe("createWorldBankAdapter — normalize", () => {
  it("maps every documented field to NormalizedOpportunity", async () => {
    const adapter = createWorldBankAdapter({ fetchImpl: vi.fn() });
    const raw = JSON.parse(fixture("worldbank-page.json")).data[0];
    const normalized = await adapter.normalize(raw);

    expect(normalized.sourceKey).toBe("world_bank");
    // Dedup key primary form
    expect(normalized.externalId).toBe("WORLD_BANK:OP00274125");
    expect(normalized.sourceUrl).toBe(
      "https://projects.worldbank.org/en/projects-operations/procurement-detail/OP00274125",
    );
    expect(normalized.title).toBe(
      "Consulting Services for Digital Health Records System",
    );
    expect(normalized.noticeType).toBe("Request for Proposals");
    expect(normalized.procurementCategory).toBe("Consulting Services");
    expect(normalized.procurementMethod).toBe("QCBS");
    expect(normalized.countryCode).toBe("BD");
    expect(normalized.countryName).toBe("Bangladesh");
    expect(normalized.region).toBe("South Asia");
    expect(normalized.projectId).toBe("P177942");
    expect(normalized.sector).toEqual(["Health"]);
    expect(normalized.publicationAt).toBe("2026-09-01T00:00:00.000Z");
    expect(normalized.deadlineAt).toBe("2026-10-15T23:59:00.000Z");
    expect(normalized.status).toBe("open");
    expect(normalized.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("uses fallback dedup hash when id is missing", async () => {
    const adapter = createWorldBankAdapter({ fetchImpl: vi.fn() });
    const raw = {
      // no id
      bid_description: "Some notice",
      project_id: "P123",
      notice_type: "REOI",
      publication_date: "2026-09-01T00:00:00.000Z",
    };
    const normalized = await adapter.normalize(raw);
    // Falls back to sha256(project_id + notice_type + publication_date + bid_description)
    expect(normalized.externalId).toMatch(/^WORLD_BANK:sha256:[a-f0-9]{64}$/);
  });

  it("marks status as 'closed' when deadline_date is in the past", async () => {
    const adapter = createWorldBankAdapter({ fetchImpl: vi.fn() });
    const raw = {
      id: "OP-past",
      bid_description: "old notice",
      deadline_date: "2020-01-01T00:00:00.000Z",
      publication_date: "2019-01-01T00:00:00.000Z",
      url: "https://example.com",
    };
    const normalized = await adapter.normalize(raw);
    expect(normalized.status).toBe("closed");
  });

  it("tolerates missing optional fields without throwing", async () => {
    const adapter = createWorldBankAdapter({ fetchImpl: vi.fn() });
    const raw = {
      id: "OP-min",
      bid_description: "minimal",
      url: "https://example.com/x",
    };
    const normalized = await adapter.normalize(raw);
    expect(normalized.title).toBe("minimal");
    expect(normalized.sector).toBeUndefined();
    expect(normalized.status).toBe("unknown"); // no deadline → unknown
  });
});
