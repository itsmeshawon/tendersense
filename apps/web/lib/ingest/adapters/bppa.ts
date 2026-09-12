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
 * BPPA (Bangladesh Public Procurement Authority) advertisement adapter.
 *
 * Recon: session 21 / 2026-09-12 via WebFetch on bppa.gov.bd.
 *
 * Structure:
 * - GET /advertisement-notices/advertisement-<category>.html?page=N
 * - Standard HTML <table> with 6 columns:
 *     [1] SI number
 *     [2] Title (linked to /advertisement-<cat>/details-<id>.html)
 *     [3] Procuring entity
 *     [4] Issue date (DD/MM/YYYY)
 *     [5] Closing date (DD/MM/YYYY hh:mm AM/PM)
 *     [6] Place / district
 * - 10 rows per page. Detail URLs are GET-linkable — no POST-form dance
 *   (unlike e-GP notices).
 *
 * MVP scope: 'goods' category only (largest — ~14k listings). Other
 * categories (works, services, physical-service) can be added by
 * spawning additional adapter instances with `category` override.
 */

const BASE = "https://www.bppa.gov.bd";
const DEFAULT_UA =
  "TenderSenseBot/0.1 (+https://tendersense.app; contact=support@tendersense.app)";
const DEFAULT_PAGE_SIZE = 10;

export type BppaCategory = "goods" | "works" | "services" | "physical-service";

export interface BppaAdapterOptions {
  fetchImpl: typeof fetch;
  userAgent?: string;
  category?: BppaCategory;
  /** Server-side default is 10; we cannot change it. Setting this only affects `isLastPage` inference. */
  pageSize?: number;
}

interface BppaRawRow {
  detailUrl: string | null;
  title: string;
  procuringEntity: string;
  issueDate: string;
  closingDate: string;
  place: string;
}

export function createBppaAdapter(
  opts: BppaAdapterOptions,
): ProcurementSourceAdapter {
  const fetchImpl = opts.fetchImpl;
  const userAgent = opts.userAgent ?? DEFAULT_UA;
  const category: BppaCategory = opts.category ?? "goods";
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;

  const listUrl = (page: number) =>
    `${BASE}/advertisement-notices/advertisement-${category}.html?page=${page}`;

  async function fetchPage(cursor?: SourceCursor): Promise<SourcePage> {
    const page = typeof cursor?.page === "number" ? cursor.page : 1;
    const res = await fetchImpl(listUrl(page), {
      method: "GET",
      headers: {
        "user-agent": userAgent,
        accept: "text/html",
      },
    });
    if (!res.ok) {
      throw new Error(`BPPA list fetch failed: HTTP ${res.status}`);
    }
    const html = await res.text();
    const rows = parseRows(html, category);
    const isLastPage = rows.length < pageSize;
    return {
      records: rows,
      isLastPage,
      nextCursor: isLastPage ? undefined : { page: page + 1 },
    };
  }

  async function normalize(raw: unknown): Promise<NormalizedOpportunity> {
    const r = raw as BppaRawRow;
    const externalId = deriveExternalId(r);
    const publicationAt = parseDate(r.issueDate);
    const deadlineAt = parseDateTime(r.closingDate);
    const status = deadlineAt ? deriveStatus(deadlineAt) : "open";
    const sourceUrl = r.detailUrl
      ? `${BASE}${r.detailUrl}`
      : `${BASE}/advertisement-notices/advertisement-${category}.html`;

    return withComputedHash({
      sourceKey: "bd_bppa",
      externalId,
      sourceUrl,
      title: r.title,
      description: undefined,
      noticeType: undefined,
      procurementCategory: category,
      procurementMethod: undefined,
      countryCode: "BD",
      countryName: "Bangladesh",
      region: undefined,
      district: r.place || undefined,
      issuerName: r.procuringEntity || undefined,
      ministryName: undefined,
      agencyName: undefined,
      procuringEntityName: r.procuringEntity || undefined,
      projectId: undefined,
      referenceNo: undefined,
      sector: undefined,
      tags: [category],
      publicationAt,
      deadlineAt,
      status,
      rawLanguage: "en",
      sourceUpdatedAt: publicationAt,
    });
  }

  async function healthCheck(): Promise<SourceHealth> {
    const startedAt = Date.now();
    try {
      const res = await fetchImpl(listUrl(1), {
        method: "GET",
        headers: { "user-agent": userAgent, accept: "text/html" },
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

  return { sourceKey: "bd_bppa", fetchPage, normalize, healthCheck };
}

// ---------------------------------------------------------------

function parseRows(html: string, category: BppaCategory): BppaRawRow[] {
  const $ = cheerio.load(html);
  const rows: BppaRawRow[] = [];
  // Match table body rows. Some pages don't wrap in <tbody>, so we scope
  // to any <tr> containing a <a href="/advertisement-<cat>/details-...">.
  $("tr").each((_, tr) => {
    const $tr = $(tr);
    const cells = $tr.find("td");
    if (cells.length < 6) return; // header row or non-data row
    const link = $tr.find(`a[href*="/advertisement-${category}/details-"]`).first();
    const detailUrl = link.attr("href") ?? null;
    const title = link.text().trim() || $(cells[1]).text().trim();
    rows.push({
      detailUrl,
      title,
      procuringEntity: $(cells[2]).text().trim(),
      issueDate: $(cells[3]).text().trim(),
      closingDate: $(cells[4]).text().trim(),
      place: $(cells[5]).text().trim(),
    });
  });
  return rows;
}

/**
 * Detail URL has the shape /advertisement-<cat>/details-<id>.html.
 * Extract the numeric id; if missing, hash the row fields for stability.
 */
function deriveExternalId(r: BppaRawRow): string {
  if (r.detailUrl) {
    const m = r.detailUrl.match(/details-(\d+)\.html/);
    if (m) return `BPPA:${m[1]}`;
  }
  const h = createHash("sha256")
    .update(
      [r.title, r.procuringEntity, r.issueDate, r.closingDate, r.place].join(
        "|",
      ),
    )
    .digest("hex");
  return `BPPA:sha256:${h}`;
}

/** Parse "DD/MM/YYYY" → ISO with Z. */
function parseDate(s: string): string | undefined {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return undefined;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}T00:00:00Z`;
}

/**
 * Parse "DD/MM/YYYY hh:mm AM/PM" → ISO with Z.
 * BPPA times are Bangladesh local (UTC+6) but we store as UTC in the
 * ISO string for now (SoT §72 flags this as a phase-2 follow-up:
 * convert BDT → UTC on ingest). Consistent with e-GP adapter.
 */
function parseDateTime(s: string): string | undefined {
  const m = s.match(
    /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i,
  );
  if (!m) return undefined;
  const [, dd, mm, yyyy, hStr, min, ampm] = m;
  let hour = parseInt(hStr, 10);
  if (ampm.toUpperCase() === "PM" && hour !== 12) hour += 12;
  if (ampm.toUpperCase() === "AM" && hour === 12) hour = 0;
  const hh = String(hour).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:00Z`;
}

function deriveStatus(deadlineIso: string): "open" | "closed" {
  return new Date(deadlineIso).getTime() > Date.now() ? "open" : "closed";
}
