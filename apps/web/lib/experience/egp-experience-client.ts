import { parseExperienceRows } from "./parser";
import type { LookupParams, LookupResult } from "./types";

const BASE = "https://www.eprocure.gov.bd";
const ADV_FORM_URL = `${BASE}/resources/common/SearcheCMS.jsp?v=advSearch`;
const SERVLET_URL = `${BASE}/AdvSearcheCMSServlet`;

const DEFAULT_USER_AGENT =
  "TenderSenseBot/0.1 (+https://tendersense.app; contact=support@tendersense.app)";

export interface ClientOptions {
  fetchImpl?: typeof fetch;
  userAgent?: string;
}

/**
 * On-demand lookup against Bangladesh e-GP's eExperience surface.
 *
 * Flow (per docs/eexperience-reconnaissance-checklist.md):
 *   1. GET the advanced-search form to establish a JSESSIONID cookie.
 *   2. POST the full 20-field payload to /AdvSearcheCMSServlet with the
 *      cookie attached.
 *   3. Parse the returned HTML with `parseExperienceRows`.
 *
 * Per ADR 0010 this is a lookup, not a `ProcurementSourceAdapter`. No
 * `source_records` writes, no revision tracking, no watermark. Callers
 * (typically the profile-onboarding server action) invoke this once
 * per user search.
 */
export async function lookupByCompanyName(
  params: LookupParams,
  opts: ClientOptions = {},
): Promise<LookupResult> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const userAgent = opts.userAgent ?? DEFAULT_USER_AGENT;

  // Step 1 — establish session
  const sessionRes = await fetchImpl(ADV_FORM_URL, {
    method: "GET",
    headers: { "user-agent": userAgent },
    redirect: "manual",
  });
  const jsessionid = extractJsessionId(sessionRes.headers);
  if (!jsessionid) {
    throw new Error(
      "eExperience: session establishment failed — no JSESSIONID cookie in response",
    );
  }

  const pageNo = params.pageNo ?? 1;
  const pageSize = params.pageSize ?? 10;

  // Step 2 — POST search
  const body = buildPayload(params, { pageNo, pageSize });
  const searchRes = await fetchImpl(SERVLET_URL, {
    method: "POST",
    headers: {
      "user-agent": userAgent,
      "content-type": "application/x-www-form-urlencoded",
      cookie: `JSESSIONID=${jsessionid}`,
    },
    body,
  });

  if (!searchRes.ok) {
    throw new Error(
      `eExperience: search failed — servlet returned ${searchRes.status}`,
    );
  }

  const html = await searchRes.text();
  const records = parseExperienceRows(html);

  return { records, pageNo, pageSize };
}

function buildPayload(
  params: LookupParams,
  paging: { pageNo: number; pageSize: number },
): string {
  const p = new URLSearchParams();
  // Fixed action key — the servlet dispatches on this
  p.set("action", "geteCMSList");
  // Empty fields we still need to send to keep the servlet happy
  p.set("keyword", "");
  p.set("officeId", "0");
  p.set("contractAwardTo", params.companyName);
  p.set("contractStartDtFrom", "");
  p.set("contractStartDtTo", "");
  p.set("contractEndDtFrom", "");
  p.set("contractEndDtTo", "");
  p.set("departmentId", "");
  p.set("tenderId", "");
  p.set("procurementMethod", "");
  p.set("procurementNature", "");
  p.set("contAwrdSearchOpt", params.match ?? "Contains");
  p.set("exCertSearchOpt", "Contains");
  p.set("exCertificateNo", params.experienceCertificateNo ?? "");
  p.set("tendererId", "");
  p.set("procType", "");
  p.set("statusTab", "All");
  p.set("pageNo", String(paging.pageNo));
  p.set("size", String(paging.pageSize));
  p.set("workStatus", params.workStatus ?? "All");
  return p.toString();
}

function extractJsessionId(headers: Headers): string | null {
  // `set-cookie` in a Response Headers object may be multiple values
  // joined with commas. Look for JSESSIONID=xxx up to the next ; or ,
  const setCookie =
    headers.get("set-cookie") ?? headers.get("Set-Cookie") ?? "";
  const m = /JSESSIONID=([^;,\s]+)/i.exec(setCookie);
  return m ? m[1] : null;
}
