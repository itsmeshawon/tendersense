import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { lookupByCompanyName } from "./egp-experience-client";

function fixture(name: string): string {
  return readFileSync(join(__dirname, "__fixtures__", name), "utf-8");
}

function makeResponse(
  body: string,
  init: { status?: number; setCookie?: string } = {},
): Response {
  const headers = new Headers({ "content-type": "text/html;charset=UTF-8" });
  if (init.setCookie) headers.append("set-cookie", init.setCookie);
  return new Response(body, { status: init.status ?? 200, headers });
}

describe("lookupByCompanyName", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("does GET-then-POST and returns parsed rows", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        makeResponse("<html></html>", {
          setCookie: "JSESSIONID=ABC123; Path=/; HttpOnly",
        }),
      )
      .mockResolvedValueOnce(makeResponse(fixture("beximco-single-row.html")));

    const result = await lookupByCompanyName(
      { companyName: "Beximco" },
      { fetchImpl },
    );

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.records).toHaveLength(1);
    expect(result.records[0].contractAwardedTo).toBe("BEXIMCO COMPUTERS LTD");

    // First call — GET to establish session
    const [firstUrl, firstInit] = fetchImpl.mock.calls[0];
    expect(String(firstUrl)).toContain(
      "/resources/common/SearcheCMS.jsp?v=advSearch",
    );
    expect(firstInit?.method ?? "GET").toBe("GET");

    // Second call — POST to servlet
    const [secondUrl, secondInit] = fetchImpl.mock.calls[1];
    expect(String(secondUrl)).toContain("/AdvSearcheCMSServlet");
    expect(secondInit?.method).toBe("POST");
  });

  it("carries the JSESSIONID cookie from the GET into the POST", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        makeResponse("<html></html>", {
          setCookie: "JSESSIONID=SESSION-XYZ; Path=/; HttpOnly",
        }),
      )
      .mockResolvedValueOnce(makeResponse(fixture("empty-results.html")));

    await lookupByCompanyName({ companyName: "Acme" }, { fetchImpl });

    const secondInit = fetchImpl.mock.calls[1][1];
    const headers = new Headers(secondInit?.headers);
    expect(headers.get("cookie")).toContain("JSESSIONID=SESSION-XYZ");
  });

  it("sends the full 20-field payload with correct defaults", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        makeResponse("<html></html>", { setCookie: "JSESSIONID=X" }),
      )
      .mockResolvedValueOnce(makeResponse(fixture("empty-results.html")));

    await lookupByCompanyName({ companyName: "Acme Corp" }, { fetchImpl });

    const secondInit = fetchImpl.mock.calls[1][1];
    const body = String(secondInit?.body ?? "");
    const params = new URLSearchParams(body);

    // Required action key
    expect(params.get("action")).toBe("geteCMSList");
    // Company-name search field + match mode default
    expect(params.get("contractAwardTo")).toBe("Acme Corp");
    expect(params.get("contAwrdSearchOpt")).toBe("Contains");
    // Work status default
    expect(params.get("workStatus")).toBe("All");
    // Paging defaults
    expect(params.get("pageNo")).toBe("1");
    expect(params.get("size")).toBe("10");
    // Other required-empty fields present
    for (const key of [
      "keyword",
      "officeId",
      "contractStartDtFrom",
      "contractStartDtTo",
      "contractEndDtFrom",
      "contractEndDtTo",
      "departmentId",
      "tenderId",
      "procurementMethod",
      "procurementNature",
      "exCertSearchOpt",
      "exCertificateNo",
      "tendererId",
      "procType",
      "statusTab",
    ]) {
      expect(params.has(key)).toBe(true);
    }
  });

  it("respects overrides for match, workStatus, pageNo, pageSize, cert", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        makeResponse("<html></html>", { setCookie: "JSESSIONID=X" }),
      )
      .mockResolvedValueOnce(makeResponse(fixture("empty-results.html")));

    await lookupByCompanyName(
      {
        companyName: "X",
        match: "Equals",
        workStatus: "Completed",
        experienceCertificateNo: "CERT-9",
        pageNo: 3,
        pageSize: 50,
      },
      { fetchImpl },
    );

    const body = String(fetchImpl.mock.calls[1][1]?.body ?? "");
    const params = new URLSearchParams(body);
    expect(params.get("contAwrdSearchOpt")).toBe("Equals");
    expect(params.get("workStatus")).toBe("Completed");
    expect(params.get("exCertificateNo")).toBe("CERT-9");
    expect(params.get("pageNo")).toBe("3");
    expect(params.get("size")).toBe("50");
  });

  it("returns an empty result set when the servlet returns no rows", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        makeResponse("<html></html>", { setCookie: "JSESSIONID=X" }),
      )
      .mockResolvedValueOnce(makeResponse(fixture("empty-results.html")));

    const result = await lookupByCompanyName(
      { companyName: "Zzz No Match" },
      { fetchImpl },
    );
    expect(result.records).toEqual([]);
    expect(result.pageNo).toBe(1);
    expect(result.pageSize).toBe(10);
  });

  it("throws with a helpful message when the servlet returns non-2xx", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        makeResponse("<html></html>", { setCookie: "JSESSIONID=X" }),
      )
      .mockResolvedValueOnce(makeResponse("boom", { status: 500 }));

    await expect(
      lookupByCompanyName({ companyName: "X" }, { fetchImpl }),
    ).rejects.toThrow(/500/);
  });

  it("sets a descriptive User-Agent per SoT §10.2", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        makeResponse("<html></html>", { setCookie: "JSESSIONID=X" }),
      )
      .mockResolvedValueOnce(makeResponse(fixture("empty-results.html")));

    await lookupByCompanyName({ companyName: "X" }, { fetchImpl });

    for (const call of fetchImpl.mock.calls) {
      const headers = new Headers(call[1]?.headers);
      const ua = headers.get("user-agent");
      expect(ua).toBeTruthy();
      expect(ua).toContain("TenderSenseBot");
    }
  });

  it("throws if the initial session GET fails to set a JSESSIONID", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(makeResponse("<html></html>")); // no set-cookie

    await expect(
      lookupByCompanyName({ companyName: "X" }, { fetchImpl }),
    ).rejects.toThrow(/session/i);
  });
});
