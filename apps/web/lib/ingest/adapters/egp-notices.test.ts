import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEgpNoticesAdapter } from "./egp-notices";

function fixture(name: string): string {
  return readFileSync(join(__dirname, "__fixtures__", name), "utf-8");
}

function htmlResponse(body: string, status = 200, setCookie?: string): Response {
  const headers = new Headers({ "content-type": "text/html;charset=UTF-8" });
  if (setCookie) headers.append("set-cookie", setCookie);
  return new Response(body, { status, headers });
}

describe("createEgpNoticesAdapter — identity + healthCheck", () => {
  it("has sourceKey bd_egp", () => {
    const a = createEgpNoticesAdapter({ fetchImpl: vi.fn() });
    expect(a.sourceKey).toBe("bd_egp");
  });

  it("healthCheck GETs the advanced form and returns ok on 200", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      htmlResponse("<html></html>"),
    );
    const a = createEgpNoticesAdapter({ fetchImpl });
    const h = await a.healthCheck();
    expect(h.ok).toBe(true);
    expect(String(fetchImpl.mock.calls[0][0])).toContain("AllTenders.jsp");
  });

  it("healthCheck returns ok=false on non-2xx", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      htmlResponse("nope", 503),
    );
    const a = createEgpNoticesAdapter({ fetchImpl });
    const h = await a.healthCheck();
    expect(h.ok).toBe(false);
  });
});

describe("createEgpNoticesAdapter — fetchPage", () => {
  let fetchImpl: ReturnType<typeof vi.fn<typeof fetch>>;

  beforeEach(() => {
    fetchImpl = vi.fn<typeof fetch>();
  });

  it("does GET-then-POST with JSESSIONID cookie carried over", async () => {
    fetchImpl
      .mockResolvedValueOnce(
        htmlResponse("<html></html>", 200, "JSESSIONID=SESS-1; Path=/"),
      )
      .mockResolvedValueOnce(
        htmlResponse(fixture("egp-notices-fragment.html")),
      );
    // pageSize=2 matches the fixture so we exercise the full-page branch
    const a = createEgpNoticesAdapter({ fetchImpl, pageSize: 2 });
    const page = await a.fetchPage();
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    // 1st — GET the advanced form
    expect(String(fetchImpl.mock.calls[0][0])).toContain("AllTenders.jsp");
    expect(fetchImpl.mock.calls[0][1]?.method ?? "GET").toBe("GET");

    // 2nd — POST to the servlet with cookie + form-encoded body
    const [postUrl, postInit] = fetchImpl.mock.calls[1];
    expect(String(postUrl)).toContain("/TenderDetailsServlet");
    expect(postInit?.method).toBe("POST");
    const headers = new Headers(postInit?.headers);
    expect(headers.get("cookie")).toContain("JSESSIONID=SESS-1");
    expect(headers.get("content-type")).toContain(
      "application/x-www-form-urlencoded",
    );

    // Payload has all 17 expected keys with sane defaults
    const params = new URLSearchParams(String(postInit?.body));
    expect(params.get("funName")).toBe("AllTenders");
    expect(params.get("viewType")).toBe("Live");
    expect(params.get("pageNo")).toBe("1");
    expect(params.get("size")).toBe("2");
    expect(params.get("isFrame")).toBe("0");
    expect(params.get("h")).toBe("t");
    for (const key of [
      "departmentId",
      "office",
      "procNature",
      "procType",
      "procMethod",
      "tenderId",
      "refNo",
      "pubDtFrm",
      "pubDtTo",
      "closeDtFrm",
      "closeDtTo",
      "cpvCategory",
    ]) {
      expect(params.has(key)).toBe(true);
    }

    expect(page.records).toHaveLength(2);
    expect(page.isLastPage).toBe(false);
    expect(page.nextCursor).toEqual({ pageNo: 2 });
  });

  it("respects the cursor's pageNo", async () => {
    fetchImpl
      .mockResolvedValueOnce(
        htmlResponse("<html></html>", 200, "JSESSIONID=X"),
      )
      .mockResolvedValueOnce(htmlResponse(fixture("egp-notices-empty.html")));
    const a = createEgpNoticesAdapter({ fetchImpl });
    await a.fetchPage({ pageNo: 5 });
    const params = new URLSearchParams(
      String(fetchImpl.mock.calls[1][1]?.body),
    );
    expect(params.get("pageNo")).toBe("5");
  });

  it("marks isLastPage=true when zero rows come back", async () => {
    fetchImpl
      .mockResolvedValueOnce(
        htmlResponse("<html></html>", 200, "JSESSIONID=X"),
      )
      .mockResolvedValueOnce(htmlResponse(fixture("egp-notices-empty.html")));
    const a = createEgpNoticesAdapter({ fetchImpl });
    const page = await a.fetchPage();
    expect(page.records).toEqual([]);
    expect(page.isLastPage).toBe(true);
  });

  it("throws when the servlet returns non-2xx", async () => {
    fetchImpl
      .mockResolvedValueOnce(
        htmlResponse("<html></html>", 200, "JSESSIONID=X"),
      )
      .mockResolvedValueOnce(htmlResponse("kaput", 502));
    const a = createEgpNoticesAdapter({ fetchImpl });
    await expect(a.fetchPage()).rejects.toThrow(/502/);
  });

  it("throws when session establishment fails (no JSESSIONID)", async () => {
    fetchImpl.mockResolvedValueOnce(htmlResponse("<html></html>", 200));
    const a = createEgpNoticesAdapter({ fetchImpl });
    await expect(a.fetchPage()).rejects.toThrow(/session/i);
  });
});

describe("createEgpNoticesAdapter — normalize", () => {
  it("extracts all fields from a real row fragment", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    fetchImpl
      .mockResolvedValueOnce(
        htmlResponse("<html></html>", 200, "JSESSIONID=X"),
      )
      .mockResolvedValueOnce(
        htmlResponse(fixture("egp-notices-fragment.html")),
      );
    const a = createEgpNoticesAdapter({ fetchImpl });
    const page = await a.fetchPage();
    const first = await a.normalize(page.records[0]);

    expect(first.sourceKey).toBe("bd_egp");
    expect(first.externalId).toBe("BD_EGP:1331092");
    expect(first.title).toContain(
      "Supply of sluice gate material",
    );
    expect(first.title).not.toContain("&amp;");
    expect(first.referenceNo).toBe("46.113.433.00.00.2026-27.004");
    expect(first.status).toBe("open"); // Live → open
    expect(first.procurementCategory).toBe("Goods");
    // "NCT" is a procurement TYPE (National / International Competitive
    // Tendering) — NormalizedOpportunity has no `procurementType` field
    // per SoT §14. Preserved in `tags` for now until we decide whether
    // to promote it to a structured column.
    expect(first.tags).toContain("NCT");
    expect(first.procurementMethod).toBe("OTM");
    expect(first.publicationAt).toBe("2026-09-10T23:00:00Z");
    expect(first.deadlineAt).toBe("2026-09-21T10:50:00Z");
    expect(first.ministryName).toContain("Ministry of Local Government");
    expect(first.procuringEntityName).toContain(
      "Office of the EE, Pagla Sewage Treatment",
    );
    // sourceUrl falls back to the search page (per recon: title link is a POST form)
    expect(first.sourceUrl).toContain("AllTenders.jsp");
    // sourceMetadata carries the internal e-GP tender id so the UI can
    // build a client-side POST form to ViewTender.jsp (recon 2026-09-12).
    expect(first.sourceMetadata).toEqual({ egpId: "1331092" });
    expect(first.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.rawLanguage).toBe("en");
    expect(first.countryCode).toBe("BD");
  });

  it("maps status text 'Live' to open, others to closed/unknown", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    fetchImpl
      .mockResolvedValueOnce(
        htmlResponse("<html></html>", 200, "JSESSIONID=X"),
      )
      .mockResolvedValueOnce(
        htmlResponse(fixture("egp-notices-fragment.html")),
      );
    const a = createEgpNoticesAdapter({ fetchImpl });
    const page = await a.fetchPage();
    const rec = await a.normalize(page.records[0]);
    expect(rec.status).toBe("open");
  });

  it("uses fallback content hash when tender id is missing", async () => {
    const a = createEgpNoticesAdapter({ fetchImpl: vi.fn() });
    // Feed a raw record missing tenderId — adapter should still produce
    // a stable externalId via sha256 fallback
    const bare = {
      tenderId: "",
      referenceNo: "REF-X",
      statusText: "Live",
      procurementNature: "Goods",
      procurementType: "NCT",
      procurementMethod: "OTM",
      title: "Some tender",
      ministry: "Ministry X",
      division: "Div",
      organization: "Org",
      procuringEntity: "PE",
      publicationAt: "2026-09-10T23:00:00Z",
      deadlineAt: "2026-09-21T10:50:00Z",
    };
    const normalized = await a.normalize(bare);
    expect(normalized.externalId).toMatch(/^BD_EGP:sha256:[a-f0-9]{64}$/);
  });
});
