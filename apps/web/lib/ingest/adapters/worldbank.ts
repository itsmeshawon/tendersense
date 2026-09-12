import { createHash } from "node:crypto";
import { withComputedHash } from "../normalizer";
import type {
  NormalizedOpportunity,
  ProcurementSourceAdapter,
  SourceCursor,
  SourceHealth,
  SourcePage,
} from "../types";

const BASE_URL =
  "https://datacatalogapi.worldbank.org/dexapps/fone/api/apiservice";
const DATASET_ID = "DS00979";
const RESOURCE_ID = "RS00909";
const DEFAULT_PAGE_SIZE = 1000;
const DEFAULT_UA =
  "TenderSenseBot/0.1 (+https://tendersense.app; contact=support@tendersense.app)";

export interface WorldBankAdapterOptions {
  fetchImpl: typeof fetch;
  userAgent?: string;
  pageSize?: number;
}

/** WB record shape as documented in SoT §10.1 + confirmed via WebFetch recon. */
interface WorldBankRecord {
  id?: string;
  bid_description?: string;
  country_code?: string;
  country_name?: string;
  deadline_date?: string;
  notice_type?: string;
  procurement_category?: string;
  procurement_method?: string;
  project_id?: string;
  publication_date?: string;
  publication___fiscal_year?: string;
  publication___calendar_year?: string;
  region?: string;
  sector?: string;
  url?: string;
}

interface WorldBankPageResponse {
  count: number;
  data: WorldBankRecord[];
}

/**
 * Adapter for the World Bank Procurement Notice public dataset (SoT §10.1).
 * Implements the `ProcurementSourceAdapter` contract from `lib/ingest/types.ts`.
 */
export function createWorldBankAdapter(
  opts: WorldBankAdapterOptions,
): ProcurementSourceAdapter {
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const userAgent = opts.userAgent ?? DEFAULT_UA;
  const fetchImpl = opts.fetchImpl;

  async function fetchPage(cursor?: SourceCursor): Promise<SourcePage> {
    const skip = Number(cursor?.skip ?? 0);
    const url = buildUrl(pageSize, skip);
    const res = await fetchImpl(url, {
      method: "GET",
      headers: { "user-agent": userAgent, accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`world_bank: fetchPage failed — ${res.status}`);
    }
    const parsed = (await res.json()) as WorldBankPageResponse;
    const records = parsed.data ?? [];
    const isLastPage = records.length < pageSize;
    return {
      records,
      isLastPage,
      nextCursor: isLastPage ? undefined : { skip: skip + records.length },
    };
  }

  async function normalize(raw: unknown): Promise<NormalizedOpportunity> {
    const r = raw as WorldBankRecord;
    const externalId = deriveExternalId(r);
    const status = deriveStatus(r);
    const sector = r.sector ? [r.sector] : undefined;

    return withComputedHash({
      sourceKey: "world_bank",
      externalId,
      sourceUrl: r.url ?? "",
      title: r.bid_description ?? "",
      noticeType: r.notice_type ?? undefined,
      procurementCategory: r.procurement_category ?? undefined,
      procurementMethod: r.procurement_method ?? undefined,
      countryCode: r.country_code ?? undefined,
      countryName: r.country_name ?? undefined,
      region: r.region ?? undefined,
      projectId: r.project_id ?? undefined,
      sector,
      publicationAt: r.publication_date ?? undefined,
      deadlineAt: r.deadline_date ?? undefined,
      status,
      rawLanguage: "en",
      sourceUpdatedAt: r.publication_date ?? undefined,
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
      if (!res.ok) {
        return {
          ok: false,
          latencyMs,
          message: `HTTP ${res.status}`,
          checkedAt: new Date().toISOString(),
        };
      }
      const body = (await res.json()) as WorldBankPageResponse;
      const ok = typeof body.count === "number" && Array.isArray(body.data);
      return {
        ok,
        latencyMs,
        message: ok ? undefined : "response missing count/data",
        checkedAt: new Date().toISOString(),
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

function buildUrl(top: number, skip: number): string {
  const p = new URLSearchParams({
    datasetId: DATASET_ID,
    resourceId: RESOURCE_ID,
    type: "json",
    top: String(top),
    skip: String(skip),
  });
  return `${BASE_URL}?${p.toString()}`;
}

/**
 * SoT §10.1 dedup key:
 *   primary  — `WORLD_BANK:{id}` when id is present
 *   fallback — sha256(project_id + notice_type + publication_date + bid_description)
 */
function deriveExternalId(r: WorldBankRecord): string {
  if (r.id && r.id.length > 0) return `WORLD_BANK:${r.id}`;
  const parts = [
    r.project_id ?? "",
    r.notice_type ?? "",
    r.publication_date ?? "",
    r.bid_description ?? "",
  ].join("|");
  const hash = createHash("sha256").update(parts, "utf8").digest("hex");
  return `WORLD_BANK:sha256:${hash}`;
}

function deriveStatus(
  r: WorldBankRecord,
): NormalizedOpportunity["status"] {
  if (!r.deadline_date) return "unknown";
  const ts = Date.parse(r.deadline_date);
  if (Number.isNaN(ts)) return "unknown";
  return ts < Date.now() ? "closed" : "open";
}
