import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseExperienceRows } from "./parser";

function fixture(name: string): string {
  return readFileSync(join(__dirname, "__fixtures__", name), "utf-8");
}

describe("parseExperienceRows", () => {
  it("returns empty array when no rows are present", () => {
    const rows = parseExperienceRows(fixture("empty-results.html"));
    expect(rows).toEqual([]);
  });

  it("extracts a single row with all fields", () => {
    const rows = parseExperienceRows(fixture("beximco-single-row.html"));
    expect(rows).toHaveLength(1);

    const r = rows[0];
    expect(r.detailId).toBe("165657");
    expect(r.detailUrl).toBe(
      "/resources/common/VieweCmsDetails.jsp?wcs=completed&Id=165657",
    );
    expect(r.workStatus).toBe("Completed");

    // Cell 4 — Tender/Ref/Title/Publish
    expect(r.tenderId).toBe("845283");
    expect(r.referenceNo).toBe("BKB/HO/ICT(OP)/7(5)-76/2022-2023/1217");
    expect(r.title).toBe(
      "Supply, Installation & Commissioning of Servers and Server Rack for Nikash-BEFTN Service of Bangladesh Krishi Bank.",
    );
    expect(r.publishingDate).toBe("2023-06-08");

    // Cell 2 — Ministry/Division/PE
    expect(r.ministry).toBe("Bank and Financial Institutions Division");
    expect(r.division).toBe("Bangladesh Krishi Bank");
    expect(r.procuringEntity).toBe("ICT Operation Department");

    // Cell 3 — Nature/Type/Method
    expect(r.procurementNature).toBe("Goods");
    expect(r.procurementType).toBe("NCT");
    expect(r.procurementMethod).toBe("OTM");

    // Cells 5-10
    expect(r.contractAwardedTo).toBe("BEXIMCO COMPUTERS LTD");
    expect(r.companyUniqueId).toBe("1103644");
    expect(r.experienceCertificateNo).toBe(
      "23/2022--2023/e-GP/20240711/845283/00165657",
    );
    expect(r.contractAmount).toBe(5_950_000.014);
    expect(r.contractStartDate).toBe("2023-10-02");
    expect(r.contractEndDate).toBe("2024-02-11");
  });

  it("extracts multiple rows in order", () => {
    const rows = parseExperienceRows(fixture("two-rows.html"));
    expect(rows).toHaveLength(2);
    expect(rows[0].contractAwardedTo).toBe("EXAMPLE CO LTD");
    expect(rows[0].workStatus).toBe("Ongoing");
    expect(rows[1].contractAwardedTo).toBe("BEXIMCO COMPUTERS LTD");
    expect(rows[1].workStatus).toBe("Completed");
  });

  it("decodes HTML entities in the title (& → &)", () => {
    const rows = parseExperienceRows(fixture("beximco-single-row.html"));
    expect(rows[0].title).toContain("Servers and Server Rack");
    expect(rows[0].title).not.toContain("&amp;");
  });

  it("parses ongoing work status from detail URL query and cell text", () => {
    const rows = parseExperienceRows(fixture("two-rows.html"));
    expect(rows[0].detailUrl).toContain("wcs=ongoing");
    expect(rows[0].workStatus).toBe("Ongoing");
  });

  it("normalizes contract amount with a decimal", () => {
    const rows = parseExperienceRows(fixture("two-rows.html"));
    expect(rows[0].contractAmount).toBe(12_345_678.5);
  });

  it("returns [] on malformed HTML without throwing", () => {
    expect(() => parseExperienceRows("<html><body>nope</body></html>"))
      .not.toThrow();
    expect(parseExperienceRows("")).toEqual([]);
  });

  it("skips rows that do not have the expected 10 cells", () => {
    const html = `<!doctype html><table><tbody>
      <tr class="bgColor-white"><td>only-one-cell</td></tr>
    </tbody></table>`;
    expect(parseExperienceRows(html)).toEqual([]);
  });

  it("parses a real e-GP fragment (bare <tr>, mixed bgColor-white + bgColor-Green)", () => {
    // Captured live 2026-09-12 from a search that was silently returning
    // zero rows in production. Two root causes fixed:
    //   1. Response is a bare fragment (no <table>) — cheerio was dropping
    //      the rows before our selector ran
    //   2. Ongoing rows use bgColor-Green, not bgColor-white
    const rows = parseExperienceRows(fixture("real-egp-fragment.html"));
    expect(rows).toHaveLength(2);

    // Row 1 — bgColor-white, Completed
    expect(rows[0].workStatus).toBe("Completed");
    expect(rows[0].contractAwardedTo).toBe("Sunnah Enterprise");
    expect(rows[0].detailId).toBe("259692");
    expect(rows[0].contractAmount).toBe(274_000);

    // Row 2 — bgColor-Green, Ongoing
    expect(rows[1].workStatus).toBe("Ongoing");
    expect(rows[1].contractAwardedTo).toBe("Sunnah Enterprise");
    expect(rows[1].detailId).toBe("163187");
    expect(rows[1].contractAmount).toBe(66906.987);
  });
});
