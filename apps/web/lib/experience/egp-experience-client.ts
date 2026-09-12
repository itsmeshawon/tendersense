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
    headers: {
      "user-agent": userAgent,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9",
    },
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

  // Step 2 — POST search.
  //
  // Headers here matter. e-GP's servlet returns an empty results table
  // (200 OK, well-formed HTML, no error markers) when the POST lacks the
  // browser-expected Referer / Accept / Accept-Language / Origin.
  // Reproduced on Vercel preview 2026-09-12: manual browser search
  // returned rows for "Sayma Construction", our bare POST returned zero.
  // Full browser-shaped header set below matches what the servlet sees
  // from the real form submission.
  const body = buildPayload(params, { pageNo, pageSize });
  const searchRes = await fetchImpl(SERVLET_URL, {
    method: "POST",
    headers: {
      "user-agent": userAgent,
      "content-type": "application/x-www-form-urlencoded",
      cookie: `JSESSIONID=${jsessionid}`,
      referer: ADV_FORM_URL,
      origin: BASE,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9",
      "x-requested-with": "XMLHttpRequest",
    },
    body,
  });

  if (!searchRes.ok) {
    throw new Error(
      `eExperience: search failed — servlet returned ${searchRes.status}`,
    );
  }

  const html = await searchRes.text();

  // Server-side diagnostic — surfaces in Vercel runtime logs. Grep for
  // `[eexp]` to inspect the raw response when searches return zero rows.
  //   len <1 KB    → session-timeout / redirect
  //   a few KB, no `bgColor-white` → servlet said "no rows"
  //   10-100+ KB → real results (parser drift, not payload issue)
  //   `bgColor-white` present but parser returns 0 → structure drifted
  //
  // Also logs whether the response contains `bgColor-white` (the row
  // selector) and `AdvSearcheCMSServlet` (self-referencing form on error
  // pages) so Mohabbat can classify without eyeballing 3 KB of HTML.
  const hasRowClass = html.includes("bgColor-white");
  const hasSelfRef = html.includes("AdvSearcheCMSServlet");
  console.log(
    `[eexp] response len=${html.length} hasRowClass=${hasRowClass} hasSelfRef=${hasSelfRef}`,
  );
  console.log(`[eexp] snippet=${html.slice(0, 3000)}`);

  detectErrorPage(html);

  const records = parseExperienceRows(html);
  return {
    records,
    pageNo,
    pageSize,
    // Diagnostic: attach a snippet when zero rows came back, so the UI
    // can render it in a debug panel. Kept in the return type as
    // optional so the type shape stays backwards-compatible.
    diagnostic:
      records.length === 0
        ? {
            responseLength: html.length,
            hasRowClass: html.includes("bgColor-white"),
            snippet: html.slice(0, 3000),
          }
        : undefined,
  };
}

/**
 * The eGP servlet answers 200 OK for several bad states we want to surface
 * as real errors instead of an empty results array:
 *   - Session-timeout redirect page
 *   - Login prompt (indicates the JSESSIONID cookie wasn't accepted)
 *
 * Legitimate empty-result responses are still valid HTML with a table
 * skeleton, so we DON'T gate on length.
 */
function detectErrorPage(html: string): void {
  const lower = html.toLowerCase();
  if (
    lower.includes("sessiontimedout") ||
    lower.includes("session has timed out")
  ) {
    throw new Error(
      "eExperience: session timed out mid-request. Retry the search.",
    );
  }
  if (
    lower.includes("user id") &&
    lower.includes("password") &&
    lower.includes("login") &&
    html.length < 10_000
  ) {
    throw new Error(
      "eExperience: servlet returned a login page — JSESSIONID cookie not accepted.",
    );
  }
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
  // Node's fetch `Headers.get('set-cookie')` returns only the first
  // set-cookie header. Servers commonly send multiple (JSESSIONID plus
  // application cookies). Use `getSetCookie()` when available (Node 22+,
  // undici) so we can scan every cookie for JSESSIONID.
  const withGetSetCookie = headers as Headers & {
    getSetCookie?: () => string[];
  };
  const cookies: string[] = withGetSetCookie.getSetCookie
    ? withGetSetCookie.getSetCookie()
    : [headers.get("set-cookie") ?? headers.get("Set-Cookie") ?? ""];

  for (const cookie of cookies) {
    const m = /JSESSIONID=([^;,\s]+)/i.exec(cookie);
    if (m) return m[1];
  }
  return null;
}
