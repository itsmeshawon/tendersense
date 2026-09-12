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

  it("healthCheck returns ok=true when API responds 200 with procnotices", async () => {
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

  it("issues a GET to search.worldbank.org with noticedate desc sort", async () => {
    fetchImpl.mockResolvedValue(jsonResponse(fixture("worldbank-page.json")));
    const adapter = createWorldBankAdapter({ fetchImpl });
    await adapter.fetchPage();
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toContain("search.worldbank.org/api/v2/procnotices");
    expect(String(url)).toContain("format=json");
    expect(String(url)).toContain("srt=noticedate");
    expect(String(url)).toContain("order=desc");
    expect(String(url)).toContain("os=0");
    expect(init?.method ?? "GET").toBe("GET");
  });

  it("respects the cursor's os offset and returns records + nextCursor when the page is full", async () => {
    fetchImpl.mockResolvedValue(jsonResponse(fixture("worldbank-page.json")));
    // pageSize=2 matches the fixture record count, so the returned page is "full"
    // → adapter must set nextCursor and mark isLastPage=false
    const adapter = createWorldBankAdapter({
      fetchImpl,
      pageSize: 2,
    });
    const page = await adapter.fetchPage({ os: 200 });
    expect(fetchImpl.mock.calls[0][0]).toContain("os=200");
    expect(fetchImpl.mock.calls[0][0]).toContain("rows=2");
    expect(page.records).toHaveLength(2);
    expect(page.isLastPage).toBe(false);
    expect(page.nextCursor).toEqual({ os: 202 });
  });

  it("marks the page last when procnotices length is less than pageSize", async () => {
    // default pageSize > fixture (2 rows)
    fetchImpl.mockResolvedValue(jsonResponse(fixture("worldbank-page.json")));
    const adapter = createWorldBankAdapter({ fetchImpl });
    const page = await adapter.fetchPage();
    expect(page.isLastPage).toBe(true);
    expect(page.nextCursor).toBeUndefined();
  });

  it("handles empty procnotices array as last page", async () => {
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
  it("maps every documented procnotices field to NormalizedOpportunity", async () => {
    const adapter = createWorldBankAdapter({ fetchImpl: vi.fn() });
    const raw = JSON.parse(fixture("worldbank-page.json")).procnotices[0];
    const normalized = await adapter.normalize(raw);

    expect(normalized.sourceKey).toBe("world_bank");
    expect(normalized.externalId).toBe("WORLD_BANK:OP00468255");
    expect(normalized.sourceUrl).toBe(
      "https://projects.worldbank.org/en/projects-operations/procurement-detail/OP00468255",
    );
    expect(normalized.title).toBe(
      "Consulting services for the design and implementation of an enterprise resource planning system across ministries",
    );
    expect(normalized.noticeType).toBe("Contract Award");
    expect(normalized.procurementCategory).toBe("CS");
    expect(normalized.procurementMethod).toBe("Quality And Cost-Based Selection");
    expect(normalized.countryCode).toBe("BD");
    expect(normalized.countryName).toBe("Bangladesh");
    expect(normalized.projectId).toBe("P123456");
    expect(normalized.referenceNo).toBe("BD-BDGM-987654-CS-QCBS");
    // noticedate "11-Sep-2026" → ISO
    expect(normalized.publicationAt).toBe("2026-09-11T00:00:00Z");
    expect(normalized.deadlineAt).toBe("2026-10-20T00:00:00Z");
    expect(normalized.rawLanguage).toBe("en");
    expect(normalized.tags).toEqual(["CS"]);
    expect(normalized.description).toContain("Bangladesh");
    expect(normalized.description).not.toContain("<");
    expect(normalized.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("derives country_code from country_name when project_ctry_code is missing", async () => {
    const adapter = createWorldBankAdapter({ fetchImpl: vi.fn() });
    const raw = JSON.parse(fixture("worldbank-page.json")).procnotices[1];
    const normalized = await adapter.normalize(raw);
    // Nepal in the fixture has no project_ctry_code — should still resolve to "NP"
    expect(normalized.countryName).toBe("Nepal");
    expect(normalized.countryCode).toBe("NP");
  });

  it("uses fallback dedup hash when id is missing", async () => {
    const adapter = createWorldBankAdapter({ fetchImpl: vi.fn() });
    const raw = {
      // no id
      bid_description: "Some notice",
      project_id: "P123",
      notice_type: "REOI",
      noticedate: "01-Sep-2026",
    };
    const normalized = await adapter.normalize(raw);
    expect(normalized.externalId).toMatch(/^WORLD_BANK:sha256:[a-f0-9]{64}$/);
  });

  it("marks status as 'closed' when submission_deadline_date is in the past", async () => {
    const adapter = createWorldBankAdapter({ fetchImpl: vi.fn() });
    const raw = {
      id: "OP-past",
      bid_description: "old notice",
      submission_deadline_date: "2020-01-01T00:00:00Z",
      noticedate: "01-Jan-2019",
    };
    const normalized = await adapter.normalize(raw);
    expect(normalized.status).toBe("closed");
  });

  it("marks status as 'awarded' when notice_type is Contract Award", async () => {
    const adapter = createWorldBankAdapter({ fetchImpl: vi.fn() });
    const raw = {
      id: "OP-award",
      bid_description: "an award notice",
      notice_type: "Contract Award",
      notice_status: "Published",
    };
    const normalized = await adapter.normalize(raw);
    expect(normalized.status).toBe("awarded");
  });

  it("marks status as 'cancelled' when notice_status = Cancelled", async () => {
    const adapter = createWorldBankAdapter({ fetchImpl: vi.fn() });
    const raw = {
      id: "OP-cancel",
      bid_description: "a cancelled notice",
      notice_status: "Cancelled",
    };
    const normalized = await adapter.normalize(raw);
    expect(normalized.status).toBe("cancelled");
  });

  it("tolerates missing optional fields without throwing", async () => {
    const adapter = createWorldBankAdapter({ fetchImpl: vi.fn() });
    const raw = {
      id: "OP-min",
      bid_description: "minimal",
    };
    const normalized = await adapter.normalize(raw);
    expect(normalized.title).toBe("minimal");
    expect(normalized.status).toBe("unknown"); // no deadline → unknown
    expect(normalized.description).toBeUndefined();
  });
});
