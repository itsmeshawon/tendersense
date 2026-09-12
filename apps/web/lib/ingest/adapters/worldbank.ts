import { createHash } from "node:crypto";
import { withComputedHash } from "../normalizer";
import type {
  NormalizedOpportunity,
  ProcurementSourceAdapter,
  SourceCursor,
  SourceHealth,
  SourcePage,
} from "../types";

/**
 * WB adapter — switched (2026-09-12) from `datacatalogapi.worldbank.org`
 * to `search.worldbank.org/api/v2/procnotices`. Old endpoint returned
 * dataset-internal order (2005–2017 archive) with no working `orderby`
 * param; new endpoint supports `srt=noticedate&order=desc` and returns
 * live tenders published on the WB Procurement Notices site.
 */
const BASE_URL = "https://search.worldbank.org/api/v2/procnotices";
const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_UA =
  "TenderSenseBot/0.1 (+https://tendersense.app; contact=support@tendersense.app)";

export interface WorldBankAdapterOptions {
  fetchImpl: typeof fetch;
  userAgent?: string;
  pageSize?: number;
}

/** WB procnotices response record. */
interface WorldBankRecord {
  id?: string;
  bid_description?: string;
  notice_type?: string;
  notice_lang_name?: string;
  notice_status?: string;
  noticedate?: string; // DD-MMM-YYYY
  submission_deadline_date?: string; // ISO
  submission_deadline_time?: string;
  submission_date?: string;
  project_id?: string;
  project_name?: string;
  project_ctry_name?: string;
  project_ctry_code?: string;
  bid_reference_no?: string;
  procurement_group?: string;
  procurement_method_code?: string;
  procurement_method_name?: string;
  notice_text?: string;
}

interface WorldBankPageResponse {
  total: string | number;
  os?: string | number;
  page?: string | number;
  rows: number;
  procnotices: WorldBankRecord[];
}

/**
 * ISO-3166 alpha-2 codes for the countries the pool most often shows.
 * WB doesn't always return `project_ctry_code`; when it's missing we
 * fall back to this map. Anything not on this list gets `undefined`
 * — matching operates on country_name in that case.
 */
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  Bangladesh: "BD",
  India: "IN",
  Pakistan: "PK",
  Nepal: "NP",
  "Sri Lanka": "LK",
  Bhutan: "BT",
  Maldives: "MV",
  Afghanistan: "AF",
  Kenya: "KE",
  Ethiopia: "ET",
  Uganda: "UG",
  Tanzania: "TZ",
  Ghana: "GH",
  Nigeria: "NG",
  Brazil: "BR",
  Argentina: "AR",
  Colombia: "CO",
  Mexico: "MX",
  Philippines: "PH",
  Indonesia: "ID",
  Vietnam: "VN",
  Uzbekistan: "UZ",
  Ukraine: "UA",
};

/**
 * Adapter for the World Bank Procurement Notices search API.
 * Implements the `ProcurementSourceAdapter` contract from `lib/ingest/types.ts`.
 */
export function createWorldBankAdapter(
  opts: WorldBankAdapterOptions,
): ProcurementSourceAdapter {
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const userAgent = opts.userAgent ?? DEFAULT_UA;
  const fetchImpl = opts.fetchImpl;

  async function fetchPage(cursor?: SourceCursor): Promise<SourcePage> {
    const os = Number(cursor?.os ?? 0);
    const url = buildUrl(pageSize, os);
    const res = await fetchImpl(url, {
      method: "GET",
      headers: { "user-agent": userAgent, accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`world_bank: fetchPage failed — ${res.status}`);
    }
    const parsed = (await res.json()) as WorldBankPageResponse;
    const records = parsed.procnotices ?? [];
    const isLastPage = records.length < pageSize;
    return {
      records,
      isLastPage,
      nextCursor: isLastPage ? undefined : { os: os + records.length },
    };
  }

  async function normalize(raw: unknown): Promise<NormalizedOpportunity> {
    const r = raw as WorldBankRecord;
    const externalId = deriveExternalId(r);
    const publicationAt = parseNoticeDate(r.noticedate);
    const deadlineAt = r.submission_deadline_date ?? undefined;
    const status = deriveStatus(r, deadlineAt);
    const countryCode =
      r.project_ctry_code ??
      (r.project_ctry_name ? COUNTRY_NAME_TO_CODE[r.project_ctry_name] : undefined);
    const description = r.notice_text
      ? stripHtml(r.notice_text).slice(0, 4000)
      : undefined;

    return withComputedHash({
      sourceKey: "world_bank",
      externalId,
      sourceUrl: r.id
        ? `https://projects.worldbank.org/en/projects-operations/procurement-detail/${r.id}`
        : "",
      title: r.bid_description ?? "",
      description,
      noticeType: r.notice_type ?? undefined,
      procurementCategory: r.procurement_group ?? undefined,
      procurementMethod:
        r.procurement_method_name ?? r.procurement_method_code ?? undefined,
      countryCode,
      countryName: r.project_ctry_name ?? undefined,
      projectId: r.project_id ?? undefined,
      referenceNo: r.bid_reference_no ?? undefined,
      tags: r.procurement_group ? [r.procurement_group] : undefined,
      publicationAt,
      deadlineAt,
      status,
      rawLanguage: langCode(r.notice_lang_name),
      sourceUpdatedAt: publicationAt,
    });
  }

  async function healthCheck(): Promise<SourceHealth> {
    const startedAt = Date.now();
    try {
      const res = await fetchImpl(buildUrl(1, 0), {
        method: "GET",
        headers: { "user-agent": userAgent, accept: "application/json" },
      });
      const latencyMs = Date.now() - startedAt;
      return {
        ok: res.ok,
        latencyMs,
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

  return { sourceKey: "world_bank", fetchPage, normalize, healthCheck };
}

function buildUrl(rows: number, os: number): string {
  const p = new URLSearchParams({
    format: "json",
    rows: String(rows),
    os: String(os),
    srt: "noticedate",
    order: "desc",
  });
  return `${BASE_URL}?${p.toString()}`;
}

/**
 * SoT §10.1 dedup key:
 *   primary  — `WORLD_BANK:{id}` when id is present
 *   fallback — sha256(project_id + notice_type + noticedate + bid_description)
 */
function deriveExternalId(r: WorldBankRecord): string {
  if (r.id && r.id.length > 0) return `WORLD_BANK:${r.id}`;
  const parts = [
    r.project_id ?? "",
    r.notice_type ?? "",
    r.noticedate ?? "",
    r.bid_description ?? "",
  ].join("|");
  const hash = createHash("sha256").update(parts, "utf8").digest("hex");
  return `WORLD_BANK:sha256:${hash}`;
}

/** Derive status from notice_status + deadline. */
function deriveStatus(
  r: WorldBankRecord,
  deadlineAt: string | undefined,
): NormalizedOpportunity["status"] {
  const notice = (r.notice_status ?? "").toLowerCase();
  if (notice === "cancelled") return "cancelled";
  if (notice === "awarded" || r.notice_type === "Contract Award") return "awarded";
  if (!deadlineAt) return "unknown";
  const t = Date.parse(deadlineAt);
  if (Number.isNaN(t)) return "unknown";
  return t > Date.now() ? "open" : "closed";
}

/** Parse "DD-MMM-YYYY" → ISO with Z. */
function parseNoticeDate(s: string | undefined): string | undefined {
  if (!s) return undefined;
  const m = s.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})$/);
  if (!m) return undefined;
  const months: Record<string, string> = {
    Jan: "01",
    Feb: "02",
    Mar: "03",
    Apr: "04",
    May: "05",
    Jun: "06",
    Jul: "07",
    Aug: "08",
    Sep: "09",
    Oct: "10",
    Nov: "11",
    Dec: "12",
  };
  const [, dd, mon, yyyy] = m;
  const mm = months[mon.slice(0, 1).toUpperCase() + mon.slice(1).toLowerCase()];
  if (!mm) return undefined;
  return `${yyyy}-${mm}-${dd}T00:00:00Z`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?p[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function langCode(name: string | undefined): string | undefined {
  if (!name) return undefined;
  const map: Record<string, string> = {
    English: "en",
    French: "fr",
    Spanish: "es",
    Portuguese: "pt",
    Arabic: "ar",
    Russian: "ru",
    Chinese: "zh",
  };
  return map[name] ?? undefined;
}
