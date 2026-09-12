import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createBppaAdapter } from "./bppa";

function fixture(name: string): string {
  return readFileSync(join(__dirname, "__fixtures__", name), "utf-8");
}

function htmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

describe("createBppaAdapter — identity + healthCheck", () => {
  it("identifies itself as bd_bppa", () => {
    const a = createBppaAdapter({ fetchImpl: vi.fn<typeof fetch>() });
    expect(a.sourceKey).toBe("bd_bppa");
  });

  it("healthCheck returns ok when the list page responds 200", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(htmlResponse("<html></html>"));
    const a = createBppaAdapter({ fetchImpl });
    const h = await a.healthCheck();
    expect(h.ok).toBe(true);
  });
});

describe("createBppaAdapter — fetchPage", () => {
  it("fetches page 1 by default with ?page=1", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(htmlResponse(fixture("bppa-goods-fragment.html")));
    const a = createBppaAdapter({ fetchImpl });
    const page = await a.fetchPage();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const url = String(fetchImpl.mock.calls[0][0]);
    expect(url).toContain("advertisement-goods.html");
    expect(url).toContain("page=1");
    expect(page.records).toHaveLength(2);
    // fixture has 2 rows out of 10 per page — isLastPage inferred from
    // count < pageSize
    expect(page.isLastPage).toBe(true);
  });

  it("advances page via cursor", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(htmlResponse(fixture("bppa-goods-fragment.html")));
    const a = createBppaAdapter({ fetchImpl });
    await a.fetchPage({ page: 5 });
    const url = String(fetchImpl.mock.calls[0][0]);
    expect(url).toContain("page=5");
  });

  it("returns empty page + isLastPage=true when no rows found", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        htmlResponse("<html><body><table></table></body></html>"),
      );
    const a = createBppaAdapter({ fetchImpl });
    const page = await a.fetchPage();
    expect(page.records).toHaveLength(0);
    expect(page.isLastPage).toBe(true);
  });
});

describe("createBppaAdapter — normalize", () => {
  it("extracts all fields from a real row", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(htmlResponse(fixture("bppa-goods-fragment.html")));
    const a = createBppaAdapter({ fetchImpl });
    const page = await a.fetchPage();
    const first = await a.normalize(page.records[0]);

    expect(first.sourceKey).toBe("bd_bppa");
    // externalId derived from the detail URL's numeric id
    expect(first.externalId).toBe("BPPA:98385");
    expect(first.title).toContain("Procurement of Gas Odorant");
    // detail URL is real (GET-linkable), unlike e-GP
    expect(first.sourceUrl).toBe(
      "https://www.bppa.gov.bd/advertisement-goods/details-98385.html",
    );
    expect(first.countryCode).toBe("BD");
    expect(first.countryName).toBe("Bangladesh");
    expect(first.procuringEntityName).toContain(
      "Karnaphuli Gas Distribution Company",
    );
    expect(first.district).toBe("Chattogram");
    expect(first.publicationAt).toBe("2026-09-10T00:00:00Z");
    // Closing date parsed with time
    expect(first.deadlineAt).toBe("2026-10-29T15:00:00Z");
    expect(first.status).toBe("open");
    expect(first.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("parses 12-hour AM/PM times correctly", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(htmlResponse(fixture("bppa-goods-fragment.html")));
    const a = createBppaAdapter({ fetchImpl });
    const page = await a.fetchPage();
    const second = await a.normalize(page.records[1]);
    // "25/09/2026 02:30 PM" → 14:30
    expect(second.deadlineAt).toBe("2026-09-25T14:30:00Z");
  });

  it("falls back to a synthetic externalId if the detail link is missing", async () => {
    const bare = {
      detailUrl: null,
      title: "No-link tender",
      procuringEntity: "X",
      issueDate: "10/09/2026",
      closingDate: "29/10/2026 03:00 PM",
      place: "Dhaka",
    };
    const a = createBppaAdapter({ fetchImpl: vi.fn<typeof fetch>() });
    const n = await a.normalize(bare);
    expect(n.externalId).toMatch(/^BPPA:sha256:[a-f0-9]{64}$/);
  });
});
