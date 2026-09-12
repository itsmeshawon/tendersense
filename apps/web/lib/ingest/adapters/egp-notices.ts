import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import { withComputedHash } from "../normalizer";
import type {
  NormalizedOpportunity,
  ProcurementSourceAdapter,
  SourceCursor,
  SourceHealth,
  SourcePage,
} from "../types";

/**
 * Bangladesh e-GP tender-notices adapter (SoT §10.2).
 *
 * Recon: docs/egp-notices-reconnaissance-checklist.md (session 16).
 *
 * Flow:
 *   1. GET AllTenders.jsp?h=t to establish a JSESSIONID
 *   2. POST TenderDetailsServlet with the 17-field payload
 *   3. Parse the HTML fragment response (bare <tr> rows, no wrapper —
 *      same shape as eExperience, apply the wrap-in-<table> trick)
 *
 * Row shape (6 cells, no class):
 *   [1] S.No
 *   [2] tenderId<br>refNo<br><label>statusText</label>
 *   [3] procurementNature<br><form...><a>title</a></form>
 *   [4] ministry<br>division<br>organization<br>procuringEntity
 *   [5] procurementType<br>procurementMethod
 *   [6] "DD-MMM-YYYY HH:MM,"<br>"DD-MMM-YYYY HH:MM"
 *      (publicationAt, deadlineAt)
 *
 * Deferred:
 *   - Title link is a POST form with hidden id + h. We can't reach a
 *     GET detail URL, so sourceUrl points at the search page and users
 *     verify via the reference number. Acceptable per SoT §11.
 *   - procNature / procMethod numeric codes (search-side filters only).
 *     Only "1" (Goods) is confirmed; adapter sends empty defaults so
 *     the servlet returns all natures/methods.
 */

const BASE = "https://www.eprocure.gov.bd";
const FORM_URL = `${BASE}/resources/common/AllTenders.jsp?h=t`;
const SERVLET_URL = `${BASE}/TenderDetailsServlet`;

const DEFAULT_UA =
  "TenderSenseBot/0.1 (+https://tendersense.app; contact=support@tendersense.app)";

export type EgpViewType = "Live" | "Archive" | "Cancel" | "AllTenders";

export interface EgpAdapterOptions {
  fetchImpl: typeof fetch;
  userAgent?: string;
  pageSize?: number;
  viewType?: EgpViewType;
}

/** Parsed row before normalize() applies types + hash. */
interface EgpRawRow {
  tenderId: string;
  referenceNo: string;
  statusText: string;
  procurementNature: string;
  procurementType: string;
  procurementMethod: string;
  title: string;
  ministry: string;
  division: string;
  organization: string;
  procuringEntity: string;
  publicationAt: string; // ISO or original
  deadlineAt: string; // ISO or original
}

export function createEgpNoticesAdapter(
  opts: EgpAdapterOptions,
): ProcurementSourceAdapter {
  const fetchImpl = opts.fetchImpl;
  const userAgent = opts.userAgent ?? DEFAULT_UA;
  const pageSize = opts.pageSize ?? 10;
  const viewType: EgpViewType = opts.viewType ?? "Live";

  async function establishSession(): Promise<string> {
    const res = await fetchImpl(FORM_URL, {
      method: "GET",
      headers: {
        "user-agent": userAgent,
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
      },
      redirect: "manual",
    });
    const jsessionid = extractJsessionId(res.headers);
    if (!jsessionid) {
      throw new Error("bd_egp: session establishment failed — no JSESSIONID");
    }
    return jsessionid;
  }

  async function fetchPage(cursor?: SourceCursor): Promise<SourcePage> {
    const pageNo = Number(cursor?.pageNo ?? 1);
    const jsessionid = await establishSession();

    const body = buildPayload({ pageNo, pageSize, viewType });
    const res = await fetchImpl(SERVLET_URL, {
      method: "POST",
      headers: {
        "user-agent": userAgent,
        "content-type": "application/x-www-form-urlencoded",
        cookie: `JSESSIONID=${jsessionid}`,
        referer: FORM_URL,
        origin: BASE,
        accept: "text/html,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
        "x-requested-with": "XMLHttpRequest",
      },
      body,
    });
    if (!res.ok) {
      throw new Error(`bd_egp: fetchPage failed — ${res.status}`);
    }

    const html = await res.text();
    console.log(
      `[bd_egp] page ${pageNo}: response len=${html.length}`,
    );

    const rows = parseNoticeRows(html);
    const isLastPage = rows.length === 0 || rows.length < pageSize;
    return {
      records: rows,
      isLastPage,
      nextCursor: isLastPage ? undefined : { pageNo: pageNo + 1 },
    };
  }

  async function normalize(raw: unknown): Promise<NormalizedOpportunity> {
    const r = raw as EgpRawRow;
    const externalId = deriveExternalId(r);
    const status = deriveStatus(r.statusText, r.deadlineAt);

    return withComputedHash({
      sourceKey: "bd_egp",
      externalId,
      // Detail is a POST form; falling back to the search page. Users
      // find the notice via referenceNo shown alongside.
      sourceUrl: FORM_URL,
      title: r.title,
      description: undefined,
      noticeType: undefined,
      procurementCategory: r.procurementNature || undefined,
      procurementMethod: r.procurementMethod || undefined,
      countryCode: "BD",
      countryName: "Bangladesh",
      region: undefined,
      district: undefined,
      issuerName: r.ministry || undefined,
      ministryName: r.ministry || undefined,
      agencyName: r.division || r.organization || undefined,
      procuringEntityName: r.procuringEntity || undefined,
      projectId: undefined,
      referenceNo: r.referenceNo || undefined,
      sector: undefined,
      // Procurement TYPE (NCT / ICT) isn't a field on NormalizedOpportunity —
      // preserve it in `tags` so consumers can filter on it later.
      tags: r.procurementType ? [r.procurementType] : undefined,
      publicationAt: r.publicationAt || undefined,
      deadlineAt: r.deadlineAt || undefined,
      status,
      rawLanguage: "en",
      sourceUpdatedAt: r.publicationAt || undefined,
      // Extra structured fields the normalized shape doesn't have —
      // keep procurementType readable somewhere. Overload procurement-
      // Category to "Goods / NCT" style if we want both later. For now
      // procurementType is dropped; recovering it is a search-side
      // consumer concern.
    });
  }

  async function healthCheck(): Promise<SourceHealth> {
    const startedAt = Date.now();
    try {
      const res = await fetchImpl(FORM_URL, {
        method: "GET",
        headers: {
          "user-agent": userAgent,
          accept: "text/html",
        },
      });
      return {
        ok: res.ok,
        latencyMs: Date.now() - startedAt,
        checkedAt: new Date().toISOString(),
        message: res.ok ? undefined : `HTTP ${res.status}`,
      };
    } catch (err) {
      return {
        ok: false,
        latencyMs: Date.now() - startedAt,
        message: err instanceof Error ? err.message : String(err),
        checkedAt: new Date().toISOString(),
      };
    }
  }

  return { sourceKey: "bd_egp", fetchPage, normalize, healthCheck };
}

// ---------------------------------------------------------------
// Payload
// ---------------------------------------------------------------

interface PayloadOpts {
  pageNo: number;
  pageSize: number;
  viewType: EgpViewType;
}

function buildPayload(opts: PayloadOpts): string {
  const p = new URLSearchParams();
  p.set("funName", "AllTenders");
  p.set("viewType", opts.viewType);
  p.set("departmentId", "");
  p.set("office", "");
  p.set("procNature", "");
  p.set("procType", "");
  p.set("procMethod", "");
  p.set("tenderId", "");
  p.set("refNo", "");
  p.set("pubDtFrm", "");
  p.set("pubDtTo", "");
  p.set("closeDtFrm", "");
  p.set("closeDtTo", "");
  p.set("cpvCategory", "");
  p.set("isFrame", "0");
  p.set("pageNo", String(opts.pageNo));
  p.set("size", String(opts.pageSize));
  p.set("h", "t");
  return p.toString();
}

// ---------------------------------------------------------------
// Row parsing
// ---------------------------------------------------------------

function parseNoticeRows(html: string): EgpRawRow[] {
  if (!html || html.trim().length === 0) return [];

  // Same fragment trick as eExperience — wrap bare <tr>s in a <table>
  // so cheerio's parser doesn't drop them.
  const $ = cheerio.load(`<table><tbody>${html}</tbody></table>`);

  const rows: EgpRawRow[] = [];
  $("tr").each((_, tr) => {
    const cells = $(tr).find("td");
    if (cells.length !== 6) return; // header rows use <th>, skip

    const getHtml = (i: number) => $(cells[i]).html() ?? "";
    const getText = (i: number) => $(cells[i]).text().trim();

    // Cell 2 — tenderId, refNo, status label
    const cell2Lines = splitOnBr($, getHtml(1));
    const tenderId = (cell2Lines[0] ?? "").replace(/,$/, "").trim();
    const referenceNo = (cell2Lines[1] ?? "").replace(/,$/, "").trim();
    const statusText = (cell2Lines[2] ?? "").trim();

    // Cell 3 — procurementNature + title (in a POST form <a>)
    const cell3 = $(cells[2]);
    const cell3Lines = splitOnBr($, getHtml(2));
    const procurementNature = (cell3Lines[0] ?? "").replace(/,$/, "").trim();
    // Title lives in the <a><span><p>Title</p></span></a>
    const titleAnchor = cell3.find("a").first();
    const title = titleAnchor.text().trim().replace(/\s+/g, " ");

    // Cell 4 — ministry / division / organization / procuringEntity
    const orgParts = splitOnBr($, getHtml(3)).map((s) =>
      s.replace(/,$/, "").trim(),
    );
    const ministry = orgParts[0] ?? "";
    const division = orgParts[1] ?? "";
    const organization = orgParts[2] ?? "";
    const procuringEntity = orgParts[3] ?? "";

    // Cell 5 — procurementType, procurementMethod
    const typeMethod = splitOnBr($, getHtml(4)).map((s) =>
      s.replace(/,$/, "").trim(),
    );
    const procurementType = typeMethod[0] ?? "";
    const procurementMethod = typeMethod[1] ?? "";

    // Cell 6 — publication + deadline, each "DD-MMM-YYYY HH:MM"
    const dateLines = splitOnBr($, getHtml(5)).map((s) =>
      s.replace(/,$/, "").trim(),
    );
    const publicationAt = toIsoDateTime(dateLines[0] ?? "");
    const deadlineAt = toIsoDateTime(dateLines[1] ?? "");

    if (!title) return; // no title = skip; happens for placeholder rows
    void getText; // suppress unused

    rows.push({
      tenderId,
      referenceNo,
      statusText,
      procurementNature,
      procurementType,
      procurementMethod,
      title,
      ministry,
      division,
      organization,
      procuringEntity,
      publicationAt,
      deadlineAt,
    });
  });

  return rows;
}

function splitOnBr($: cheerio.CheerioAPI, cellHtml: string): string[] {
  return cellHtml
    .split(/<br\s*\/?>/i)
    .map((chunk) => $("<div>").html(chunk).text().trim())
    .filter((s) => s.length > 0);
}

const MONTHS: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

/**
 * Convert "DD-MMM-YYYY HH:MM" (e.g. "10-Sep-2026 23:00") → ISO 8601
 * UTC "YYYY-MM-DDTHH:MM:00Z". The eGP times are Bangladesh local (BDT,
 * UTC+6) but the SoT stores UTC — we're deliberately treating the
 * displayed value as UTC for now because the servlet doesn't publish
 * a timezone marker. Fixing this properly is a follow-up (SoT §72 —
 * timezones open thread).
 */
function toIsoDateTime(input: string): string {
  const m = /^(\d{2})-([A-Za-z]{3})-(\d{4})\s+(\d{2}):(\d{2})$/.exec(
    input.trim(),
  );
  if (!m) return input.trim();
  const month = MONTHS[m[2]];
  if (!month) return input.trim();
  return `${m[3]}-${month}-${m[1]}T${m[4]}:${m[5]}:00Z`;
}

/**
 * SoT §10.2 dedup key:
 *   primary  — `BD_EGP:{tenderId}` when tenderId is present
 *   fallback — sha256(refNo + ministry + deadline + title)
 */
function deriveExternalId(r: EgpRawRow): string {
  if (r.tenderId && r.tenderId.length > 0) return `BD_EGP:${r.tenderId}`;
  const parts = [
    r.referenceNo ?? "",
    r.ministry ?? "",
    r.deadlineAt ?? "",
    r.title ?? "",
  ].join("|");
  const hash = createHash("sha256").update(parts, "utf8").digest("hex");
  return `BD_EGP:sha256:${hash}`;
}

function deriveStatus(
  statusText: string,
  deadlineIso: string,
): NormalizedOpportunity["status"] {
  const lower = statusText.toLowerCase();
  if (lower.includes("live")) return "open";
  if (lower.includes("cancel")) return "cancelled";
  if (lower.includes("archive")) return "closed";
  // Fall back to deadline comparison
  if (!deadlineIso) return "unknown";
  const ts = Date.parse(deadlineIso);
  if (Number.isNaN(ts)) return "unknown";
  return ts < Date.now() ? "closed" : "open";
}

function extractJsessionId(headers: Headers): string | null {
  const withGetSetCookie = headers as Headers & {
    getSetCookie?: () => string[];
  };
  const cookies: string[] = withGetSetCookie.getSetCookie
    ? withGetSetCookie.getSetCookie()
    : [headers.get("set-cookie") ?? ""];
  for (const c of cookies) {
    const m = /JSESSIONID=([^;,\s]+)/i.exec(c);
    if (m) return m[1];
  }
  return null;
}
