/**
 * Ingestion types.
 *
 * These types mirror the DB schema and the SoT §14 canonical shape.
 * Adapters produce {@link NormalizedOpportunity}s; the runner writes
 * them into `public.opportunities` and stores the raw payload in
 * `public.source_records`.
 *
 * Type-only file — no runtime code.
 */

/** Known procurement sources. Grows when new adapters are added. */
export type SourceKey = "world_bank" | "bd_egp";

export type OpportunityStatus =
  | "open"
  | "closed"
  | "cancelled"
  | "awarded"
  | "unknown";

/**
 * Canonical normalized opportunity (SoT §14).
 * Every adapter's `normalize` returns this shape.
 */
export interface NormalizedOpportunity {
  sourceKey: string;
  externalId: string;
  sourceUrl: string;

  title: string;
  description?: string;

  noticeType?: string;
  procurementCategory?: string;
  procurementMethod?: string;

  countryCode?: string;
  countryName?: string;
  region?: string;
  district?: string;

  issuerName?: string;
  ministryName?: string;
  agencyName?: string;
  procuringEntityName?: string;

  projectId?: string;
  referenceNo?: string;

  sector?: string[];
  tags?: string[];

  publicationAt?: string;
  deadlineAt?: string;

  currency?: string;
  estimatedValueMin?: number;
  estimatedValueMax?: number;

  status: OpportunityStatus;

  rawLanguage?: string;
  sourceUpdatedAt?: string;

  /**
   * Adapter-specific extras that don't fit the normalized schema but are
   * needed downstream (e.g., bd_egp stashes `egpId` here so the UI can
   * open the POST-only tender detail page). Kept as free-form JSON.
   */
  sourceMetadata?: Record<string, unknown>;

  /** SHA-256 hex of the material fields; drives revision detection. */
  contentHash: string;
}

/** Per-adapter cursor state, persisted in `public.sources.configuration`. */
export interface SourceCursor {
  [key: string]: unknown;
}

/** One page of records returned by an adapter's `fetchPage`. */
export interface SourcePage {
  records: unknown[];
  nextCursor?: SourceCursor;
  isLastPage: boolean;
}

/** Adapter health-check outcome. */
export interface SourceHealth {
  ok: boolean;
  latencyMs: number;
  message?: string;
  /** ISO-8601 UTC timestamp. */
  checkedAt: string;
}

/** Row shape that the runner writes to `public.source_records`. */
export interface SourceRecord {
  sourceKey: string;
  externalId: string;
  sourceUrl: string;
  payload: unknown;
  contentHash: string;
  /** ISO-8601 UTC timestamp. */
  fetchedAt: string;
}

/** Optional detail-page payload fetched on demand. */
export interface SourceDetail {
  html?: string;
  extra?: Record<string, unknown>;
}

/**
 * Contract every source adapter implements.
 *
 * The runner orchestrates: fetchPage → normalize → upsert. Adapters are
 * responsible for HTTP quirks, pagination, and mapping to
 * {@link NormalizedOpportunity}. They do NOT touch the DB.
 */
export interface ProcurementSourceAdapter {
  readonly sourceKey: SourceKey;
  fetchPage(cursor?: SourceCursor): Promise<SourcePage>;
  normalize(record: unknown): Promise<NormalizedOpportunity>;
  fetchDetails?(record: SourceRecord): Promise<SourceDetail>;
  healthCheck(): Promise<SourceHealth>;
}
