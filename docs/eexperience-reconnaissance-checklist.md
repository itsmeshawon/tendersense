# eExperience Reconnaissance — Complete

**Status:** DONE 2026-09-12. Enough information to write the eExperience lookup code.

Answers combined from WebFetch reconnaissance and manual dev-tools capture. Field names + POST endpoint + payload shape + row markup + detail page URL all confirmed.

---

## Landing page + entry to advanced search

- **Basic search form:** `https://www.eprocure.gov.bd/resources/common/SearcheCMS.jsp` — public, no login
- **Advanced search form (the one we need):** `https://www.eprocure.gov.bd/resources/common/SearcheCMS.jsp?v=advSearch`
- The advanced view is toggled with `?v=advSearch` and exposes the fields we care about (Contract Awarded To, Company Unique ID, Experience Certificate No, Work Status)

## The four fields our adapter uses

Captured from live HTML — real `name` and `id` attributes:

```html
<!-- Contract Awarded To (company name) — main input -->
<select name="contAwrdSearchOpt" id="contAwrdSearchOpt">
  <option value="Contains" selected>Contains</option>
  <option value="Equals">Equals</option>
</select>
<input name="contractAwardTo" id="txtContractAwardTo" type="text">

<!-- Company Unique ID -->
<input name="txtTendererId" id="txtTendererId" type="text">

<!-- Experience Certificate No -->
<select name="exCertSearchOpt" id="exCertSearchOpt">
  <option value="Contains" selected>Contains</option>
  <option value="Equals">Equals</option>
</select>
<input name="exCertificateNo" id="exCertificateNo" type="text">

<!-- Work Status -->
<select name="cmbWorkStatus" id="cmbWorkStatus">
  <option value="All" selected>All</option>
  <option value="Completed">Completed</option>
  <option value="Ongoing">Ongoing</option>
</select>
```

**Note the JS rewrite:** HTML `name` attributes differ from the actual POST field names in some cases. Client-side JavaScript renames fields before submission. The submitted payload uses `tendererId` (not `txtTendererId`) and `workStatus` (not `cmbWorkStatus`). See §Search endpoint for the ground truth.

## Search endpoint

- **URL:** `https://www.eprocure.gov.bd/AdvSearcheCMSServlet`
- **Method:** `POST`
- **Content-Type:** `application/x-www-form-urlencoded`
- **Response Content-Type:** `text/html;charset=UTF-8` (HTML fragment, no JSON option)
- **Session:** `JSESSIONID` cookie required — establish by fetching `SearcheCMS.jsp?v=advSearch` first

**Full POST payload** (all 20 fields, empty values = `""`):

```
action=geteCMSList
keyword=
officeId=0
contractAwardTo=BRAC IT              <-- our search value
contractStartDtFrom=
contractStartDtTo=
contractEndDtFrom=
contractEndDtTo=
departmentId=
tenderId=
procurementMethod=
procurementNature=
contAwrdSearchOpt=Contains           <-- match mode for contractAwardTo
exCertSearchOpt=Contains             <-- match mode for exCertificateNo
exCertificateNo=
tendererId=
procType=
statusTab=All
pageNo=1
size=10
workStatus=All                       <-- All | Completed | Ongoing
```

**Adapter must send all fields**, empty strings included. The servlet probably rejects malformed bodies.

## Result row shape

Each row is one `<tr class="bgColor-white">` with **10 cells**:

| Cell | Content | Extraction |
|---|---|---|
| 1 | Row number (S. No.) | skip |
| 2 | Ministry / Division / PE (three lines separated by `<br>`) | 3 fields — split on `<br>` |
| 3 | Nature / Type / Method (three lines) | 3 fields — split on `<br>` |
| 4 | Tender ID + Ref No + **Title link** + Publishing Date | Contains `<a href="/resources/common/VieweCmsDetails.jsp?wcs=<status>&Id=<id>">Title</a>` |
| 5 | Contract Awarded To (winning company) | text |
| 6 | Company Unique ID | text (numeric) |
| 7 | Experience Certificate No | text (long alphanumeric, may wrap) |
| 8 | Contract Amount | numeric string, no currency symbol (BDT implied) |
| 9 | Contract Start Date + End Date (two lines) | 2 dates, split on `<br>` |
| 10 | Work Status | text (Completed / Ongoing) |

**Sample row (Beximco):**

```html
<tr class="bgColor-white">
  <td class="t-align-center">1</td>
  <td class="t-align-center">Bank and Financial Institutions Division,<br>Bangladesh Krishi Bank,<br>ICT Operation Department</td>
  <td class="t-align-center">Goods,<br>NCT,<br>OTM</td>
  <td class="t-align-center">845283, BKB/HO/ICT(OP)/7(5)-76/2022-2023/1217<br>
    <a href="/resources/common/VieweCmsDetails.jsp?wcs=completed&Id=165657" target="_blank">
      Supply, Installation & Commissioning of Servers and Server Rack for Nikash-BEFTN Service of Bangladesh Krishi Bank.
    </a><br>08-Jun-2023</td>
  <td class="t-align-left">BEXIMCO COMPUTERS LTD</td>
  <td class="t-align-center">1103644</td>
  <td class="t-align-left">23/2022--2023/e-GP/20240711/845283/00165657</td>
  <td class="t-align-right">5950000.014</td>
  <td class="t-align-center">02-Oct-2023<br>11-Feb-2024</td>
  <td class="t-align-center">Completed</td>
</tr>
```

## Detail page

- URL pattern: `/resources/common/VieweCmsDetails.jsp?wcs=<workStatus>&Id=<internalId>`
- `wcs` = `completed` or `ongoing`
- `Id` = internal e-GP row id (not the certificate number, not the tender ID)
- Opens in a new tab (`target="_blank"`)
- Whether it has more fields worth fetching — deferred; for MVP the row payload is enough

## Pagination

- Explicit `pageNo` + `size` params in POST body
- Default `size=10`
- Total-page indicator visible in results container (previously observed "Page 1 of 10")
- Adapter can request `size=100` to reduce roundtrips — needs testing to confirm cap

## Bangla / English + digits

- Amounts (`5950000.014`) and dates (`02-Oct-2023`) come in **Western digits + English format** by default
- Bilingual toggle exists in page header, but the servlet responds in English regardless of URL (no lang param seen in payload)
- Adapter can stay English-only

## robots.txt + T&C

- `/robots.txt` redirects to session-timeout page — not usable as policy guidance
- T&C footer link — **not captured this session**; note as small remaining task before the adapter ships to production. The counsel question already covers automated-access risk in general.

## Edge cases

- **Empty results (BRAC IT, DataSoft):** results table shows no rows. Row-count indicator: not confirmed but presumably "0 records" or similar.
- **Rapid-fire captcha / throttle:** not tested — no captcha appeared in normal use, but 5-search burst was not run. Adapter should include the 3-5s courtesy delay from ADR 0010 §Cost.
- **Detail page:** not visited — deferred, not blocking.

---

## Blocker candidates — status

- ✅ Captcha: none observed during normal use. Adapter still throttles by convention.
- ✅ Session requirement: JSESSIONID, standard cookie handling.
- ⚠ T&C automated-access clause: not read this session. Small follow-up — read the footer T&C page, note any restriction, decide with counsel input. Not blocking initial code, is blocking production launch.

## The unexpected finding — BRAC IT returned zero

**Peak 1 of the pilot demo relies on typing "BRAC IT" and seeing their contracts appear.** This test showed **BRAC IT and DataSoft returned zero results**; only Beximco returned one row.

Possibilities:

1. BRAC IT's eGP entries are registered under a different legal name (e.g. "BRAC IT Services Limited", "BITS", "BRAC Bank IT", etc.)
2. BRAC IT wins contracts through offline/manual procurement channels not reflected in eExperience
3. BRAC IT genuinely hasn't won eGP-tracked government contracts in the timeframe queried

**Implication for the demo:** Peak 1 as scripted in `docs/pilot-demo-script.md` §4 does not work with the input "BRAC IT" today. Options:

- **A.** Try name variants during the demo. Requires knowing which variant works — must be tested in advance.
- **B.** Pre-seed BRAC IT's profile manually with 3-5 real contracts sourced elsewhere. Demo shows a workspace already populated, framed as "here's what your profile looks like after the eExperience lookup runs."
- **C.** Switch demo target from BRAC IT to a company with confirmed eExperience presence (Beximco has data).
- **D.** Ship a smaller version of Peak 1: "type your company name" → results appear or "no results — add manually." Honest but less dramatic.

**Recommend:** confirm with BRAC IT directly which name they register under on e-GP, before committing to Option A. Add to open threads / demo prep. Do not schedule the demo until this is resolved.

## Design implications for the adapter

The eExperience lookup can be written now — no dependency on PR #8's adapter contract, per ADR 0010 (it's a lookup, not a `ProcurementSourceAdapter`).

Shape:

```ts
// apps/web/lib/experience/egp-experience-client.ts

interface LookupParams {
  companyName: string
  match?: "Contains" | "Equals"     // default Contains
  workStatus?: "All" | "Completed" | "Ongoing"  // default Completed
  pageSize?: number                  // default 25; adapter tests cap
}

interface ExperienceRecord {
  detailId: string                   // internal e-GP id from href
  detailUrl: string                  // absolute URL to /VieweCmsDetails.jsp?...
  workStatus: "completed" | "ongoing"

  // Cell 4 fields
  tenderId: string
  referenceNo: string
  title: string
  publishingDate: string             // ISO 8601 after parse

  // Cell 2 fields
  ministry: string
  division: string
  procuringEntity: string

  // Cell 3 fields
  procurementNature: string          // Goods / Works / Services
  procurementType: string            // NCT / ICT
  procurementMethod: string          // OTM / DTM / etc.

  // Cells 5-10
  contractAwardedTo: string
  companyUniqueId: string
  experienceCertificateNo: string
  contractAmount: number             // in BDT
  contractStartDate: string          // ISO 8601
  contractEndDate: string            // ISO 8601
}

export async function lookupByCompanyName(
  params: LookupParams
): Promise<ExperienceRecord[]>
```

Flow:
1. GET `https://www.eprocure.gov.bd/resources/common/SearcheCMS.jsp?v=advSearch` — establish JSESSIONID
2. POST to `https://www.eprocure.gov.bd/AdvSearcheCMSServlet` with full payload + cookie
3. Parse HTML response with `cheerio` — select `tr.bgColor-white`
4. Extract 10 cells per row, split multi-line cells on `<br>`
5. Parse `<a href>` in cell 4 to get detailId + workStatus
6. Parse date strings from `02-Oct-2023` format
7. Return array

Throttling: 3-5s delay between successive calls (per ADR 0010).

Session pool: on-demand lookup, one call per user action, so a short in-memory session cache (JSESSIONID for 20 minutes) is enough. No need for a persistent session store.

---

## What's now closed

- Q1 through Q11 (form + endpoint + payload + row structure + pagination) — all answered
- Q17 (language) + Q18 (digit form) — English + Western digits
- Q19 (robots.txt) — broken; not usable
- Adapter design has enough detail to write

## What's still open (minor)

- Q14 rapid-fire throttle behavior — untested; assume none, adapter throttles by convention
- Q15/Q16 detail page — not visited; not blocking
- Q20 T&C automated-access clause — not read; blocking production launch, not development
- **BRAC IT name variance** — moved to Project_Status open_questions; blocks pilot demo scheduling

## Bottom line

The eExperience adapter can be written in a single PR after this. The demo can be scheduled only after the BRAC IT name question is answered.
