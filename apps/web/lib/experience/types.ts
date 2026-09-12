/**
 * eExperience types (SoT §16.9 + ADR 0010).
 *
 * eExperience is an on-demand lookup, not a `ProcurementSourceAdapter`
 * (see decisions/0010-eexperience-on-demand.md). These types are local
 * to `lib/experience/` and intentionally decoupled from `lib/ingest/`.
 */

export type WorkStatus = "All" | "Completed" | "Ongoing";

export interface LookupParams {
  /** Company name to search for. Passed to the e-GP servlet as `contractAwardTo`. */
  companyName: string;
  /** Match mode. Defaults to "Contains" — matches how the eGP UI defaults. */
  match?: "Contains" | "Equals";
  /** Server-side filter. Defaults to "All" (matches eGP default). */
  workStatus?: WorkStatus;
  /** Optional certificate-number filter for verification flows. */
  experienceCertificateNo?: string;
  /** Result page (1-based). Defaults to 1. */
  pageNo?: number;
  /** Page size. eGP default is 10; larger sizes reduce round-trips but may hit a server cap. */
  pageSize?: number;
}

export interface ExperienceRecord {
  /** Internal e-GP row id extracted from the detail-page `<a href>`. */
  detailId: string;
  /** Detail-page URL as returned by e-GP (relative path). Callers may absolutize. */
  detailUrl: string;
  /** Denormalized work status — parsed from the last cell. */
  workStatus: "Completed" | "Ongoing";

  // Cell 4 — Tender/Ref/Title/Publish (four fields packed in one cell)
  tenderId: string;
  referenceNo: string;
  title: string;
  publishingDate: string; // ISO-8601 date

  // Cell 2 — Ministry/Division/PE hierarchy
  ministry: string;
  division: string;
  procuringEntity: string;

  // Cell 3 — Nature/Type/Method
  procurementNature: string;
  procurementType: string;
  procurementMethod: string;

  // Cells 5-10
  contractAwardedTo: string;
  companyUniqueId: string;
  experienceCertificateNo: string;
  contractAmount: number; // BDT
  contractStartDate: string; // ISO-8601 date
  contractEndDate: string; // ISO-8601 date
}

export interface LookupResult {
  records: ExperienceRecord[];
  pageNo: number;
  pageSize: number;
}
