import * as cheerio from "cheerio";
import type { ExperienceRecord } from "./types";

const MONTHS: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

/**
 * Convert "dd-MMM-yyyy" (e.g. "08-Jun-2023") → ISO "yyyy-mm-dd".
 * Returns the input unchanged if the format doesn't match — the caller
 * will notice a non-ISO string and can decide policy.
 */
function toIsoDate(input: string): string {
  const m = /^(\d{2})-([A-Za-z]{3})-(\d{4})$/.exec(input.trim());
  if (!m) return input.trim();
  const month = MONTHS[m[2]];
  if (!month) return input.trim();
  return `${m[3]}-${month}-${m[1]}`;
}

/**
 * Split a cell's text on `<br>` markers. Cheerio's `.text()` already
 * strips tags, but multi-line cells use `<br>` between fields — we
 * need to convert those to newlines before extracting.
 */
function splitOnBr($: cheerio.CheerioAPI, cellHtml: string): string[] {
  // Use cheerio to parse each fragment: split on `<br>` variants first
  const parts = cellHtml
    .split(/<br\s*\/?>/i)
    .map((chunk) => $("<div>").html(chunk).text().trim())
    .filter((s) => s.length > 0);
  return parts;
}

function parseNumber(raw: string): number {
  const n = Number(raw.replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

/**
 * Parse the HTML fragment/document returned by AdvSearcheCMSServlet and
 * return one ExperienceRecord per `tr.bgColor-white` row.
 *
 * The servlet returns HTML with 10 cells per row (see
 * docs/eexperience-reconnaissance-checklist.md). Cells 2, 3, 4, and 9
 * pack multiple fields separated by `<br>` — we split those on
 * `<br>` and extract each piece.
 *
 * Robustness rules:
 *  - Returns `[]` (not throws) on empty / malformed input
 *  - Skips rows that don't have exactly 10 cells
 *  - Preserves original text if a date doesn't match `dd-MMM-yyyy`
 */
export function parseExperienceRows(html: string): ExperienceRecord[] {
  if (!html || html.trim().length === 0) return [];

  const $ = cheerio.load(html);
  const rows = $("tr.bgColor-white");
  const out: ExperienceRecord[] = [];

  rows.each((_, tr) => {
    const cells = $(tr).find("td");
    if (cells.length !== 10) return;

    const getHtml = (i: number) => $(cells[i]).html() ?? "";
    const getText = (i: number) => $(cells[i]).text().trim();

    // Cell 2 — Ministry / Division / PE (each line may end with a stray comma)
    const orgParts = splitOnBr($, getHtml(1)).map((s) =>
      s.replace(/,$/, "").trim(),
    );
    const ministry = orgParts[0] ?? "";
    const division = orgParts[1] ?? "";
    const procuringEntity = orgParts[2] ?? "";

    // Cell 3 — Nature / Type / Method (may include trailing commas)
    const natureParts = splitOnBr($, getHtml(2)).map((s) =>
      s.replace(/,$/, "").trim(),
    );
    const procurementNature = natureParts[0] ?? "";
    const procurementType = natureParts[1] ?? "";
    const procurementMethod = natureParts[2] ?? "";

    // Cell 4 — Tender ID + Ref No + <a>Title</a> + Publishing Date
    const cell4 = $(cells[3]);
    const anchor = cell4.find("a").first();
    const title = anchor.text().trim();
    const detailUrl = anchor.attr("href") ?? "";
    const detailIdMatch = /[?&]Id=([^&]+)/.exec(detailUrl);
    const detailId = detailIdMatch ? decodeURIComponent(detailIdMatch[1]) : "";

    // Split cell 4 text — line 1: "tenderId, refNo", line 2: title, line 3: publish date
    const cell4Lines = splitOnBr($, getHtml(3));
    // Line 1 is "845283, BKB/HO/ICT(OP)/7(5)-76/2022-2023/1217"
    const idRefLine = cell4Lines[0] ?? "";
    const commaIdx = idRefLine.indexOf(",");
    const tenderId = commaIdx >= 0 ? idRefLine.slice(0, commaIdx).trim() : idRefLine.trim();
    const referenceNo = commaIdx >= 0 ? idRefLine.slice(commaIdx + 1).trim() : "";
    // Last line is the publish date
    const publishingDate = toIsoDate(cell4Lines[cell4Lines.length - 1] ?? "");

    // Cell 9 — Contract start/end dates on separate lines
    const dateLines = splitOnBr($, getHtml(8));
    const contractStartDate = toIsoDate(dateLines[0] ?? "");
    const contractEndDate = toIsoDate(dateLines[1] ?? "");

    // Cell 10 — Work Status text
    const workStatusText = getText(9);
    const workStatus: "Completed" | "Ongoing" =
      workStatusText === "Ongoing" ? "Ongoing" : "Completed";

    out.push({
      detailId,
      detailUrl,
      workStatus,

      tenderId,
      referenceNo,
      title,
      publishingDate,

      ministry,
      division,
      procuringEntity,

      procurementNature,
      procurementType,
      procurementMethod,

      contractAwardedTo: getText(4),
      companyUniqueId: getText(5),
      experienceCertificateNo: getText(6),
      contractAmount: parseNumber(getText(7)),
      contractStartDate,
      contractEndDate,
    });
  });

  return out;
}
