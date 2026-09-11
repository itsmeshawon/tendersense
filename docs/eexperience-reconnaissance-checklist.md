# eExperience Reconnaissance Checklist

**Status:** Partially answered by WebFetch reconnaissance 2026-09-12. Remaining questions marked **[HUMAN]** need a browser + Network tab (~10 min).

**Why manual for the remainder:** e-GP's eExperience form submits via POST/AJAX; GET-with-parameters doesn't trigger a search. To get exact input `name` attributes, the POST body, pagination params, and session-cookie behavior, someone (you or Mohabbat) needs to actually submit a search and watch the Network tab.

**How the pre-fill happened:** WebFetch on `eprocure.gov.bd/robots.txt`, the domain root, and `SearcheCMS.jsp` (as GET). Every answer below is annotated `[via WebFetch]` or `[HUMAN]`.

---

## Step 1 — Entry point

**Q1. Landing URL of the eExperience search form:**
`https://www.eprocure.gov.bd/resources/common/SearcheCMS.jsp` — [via WebFetch]

Confirmed via the eGP homepage's dashboard link labeled "eExperience".

**Q2. Is a login required to see the search form?** — [via WebFetch]
**No.** The homepage `https://www.eprocure.gov.bd/` shows a login form, but that login is for *registered eGP users* (bidders + procuring entities). The eExperience search page itself is publicly accessible without authentication.

## Step 2 — Submit a search

**Q3. HTTP method** — [HUMAN needed]
WebFetch attempted a GET with `?contractAwardedTo=BRAC%20IT&workStatus=Completed`. The page returned but with an *empty results table* (no submission fired). This means the form **does not accept GET-with-params.** Options:

- POST to the same URL
- POST to a separate handler (typical JSP: `SearcheCMSResult.jsp` or `SearcheCMSAction.do`)
- AJAX to a JSON/XML endpoint

**You need to confirm:** Open Chrome/Firefox dev tools → Network tab → submit the form with a company name → note the exact request URL, method, and body.

**Q4. Full URL of the results page** — [HUMAN needed]
_______________________________________________

**Q5. Query-string / POST field names** — [HUMAN needed]

WebFetch could see the form field *labels* but the JSP source-side `name` attributes are what we need. Fill in from the Network tab:

| Label | Best-guess name | Actual `name` attr (fill in) |
|---|---|---|
| Ministry/Division/Organization | `ministry` | |
| Procuring Entity | `procuringEntity` | |
| Procurement Nature | `procurementNature` | |
| Tender/Proposal ID | `tenderId` | |
| Procurement Method | `procurementMethod` | |
| Contract Start Date From | `contractStartDateFrom` | |
| Contract Start Date To | `contractStartDateTo` | |
| Contract End Date From | `contractEndDateFrom` | |
| Contract End Date To | `contractEndDateTo` | |
| Work Status (All/Completed/Ongoing) | `workStatus` | |
| **Contract Awarded To** (our company-name field) | `contractAwardedTo` | |
| Company Unique ID | `companyUniqueId` | |
| Experience Certificate No | `experienceCertificateNo` | |
| Procurement Type | `procurementType` | |
| Tender Type | `tenderType` | |

Note the "Contract Awarded To" field has a **Contains / Equals radio** — capture the radio's `name` and the two values (likely `contractAwardedToMatch=contains|equals`).

**Q6. Hidden fields, session tokens, CSRF, captcha** — [HUMAN needed]
WebFetch didn't detect any tokens visible in the rendered HTML, but JSP apps typically carry a `jsessionid` cookie and often hidden `_csrf` or `_token` fields. Confirm in Network tab:
- Cookie header on the request: `_______________________________________________`
- Any hidden form fields (search Network → Request → Form Data): `___`
- Captcha element? (There was none in the initial page render — but confirm none appears after first search): `___`

## Step 3 — Inspect the results page

**Q7. Server-rendered or AJAX** — [via WebFetch, partial]
**Mixed.** The form itself is server-rendered HTML. The results table is populated via JavaScript/AJAX after form submission — WebFetch saw a "loading.gif" placeholder and "Page 1 of 10" in the empty state, confirming client-side rendering of results.

**Whether the AJAX endpoint returns JSON, XML, or HTML fragment** — [HUMAN needed] — check the response Content-Type in Network tab.

**Q8. Number of results returned for the tested company** — [HUMAN needed]
Test with "BRAC IT" — expected: several rows. Note the count. `___`

**Q9. HTML structure of ONE result row** — [HUMAN needed]
Copy the outer HTML from Elements panel. If AJAX returns JSON, copy one JSON record instead:

```
Paste here:



```

**Q10. Per-row fields we care about** — [via WebFetch: column headers known; row markup needs [HUMAN]]

The results table has these 10 columns (from WebFetch):

| Column header (verbatim) | Our field | Confirmed present |
|---|---|---|
| S. No. | (skip) | ✓ via WebFetch |
| Ministry, Division, Organization, PE | Procuring entity / Ministry / Agency name | ✓ via WebFetch |
| Procurement Nature, Type & Method | Procurement method + category | ✓ via WebFetch |
| Tender/Proposal ID, Ref No., Title & Publishing Date | External ID + reference no + title + publication date (4 fields combined) | ✓ via WebFetch |
| Contract Awarded To | Winning company name | ✓ via WebFetch |
| Company Unique ID | Company ID (useful for follow-up filter) | ✓ via WebFetch |
| Experience Certificate No | Certificate number (this is our key value) | ✓ via WebFetch |
| Contract Amount | Value + currency | ✓ via WebFetch |
| Contract Start & End Date | Awarded date + end date | ✓ via WebFetch |
| Work Status | Ongoing / Completed | ✓ via WebFetch |

**Fill in the exact CSS selector for each cell** — [HUMAN needed] — right-click a cell in Elements panel:
- Contract title cell selector: `___`
- Certificate number cell selector: `___`
- Contract amount cell selector: `___`
- Any detail-page anchor `<a href>` on the title cell? `___`

**Q11. Pagination** — [via WebFetch, partial]
WebFetch saw "Page 1 of 10" in the empty state. So pagination exists but exact param name is unknown.
- Results per page (visible?) — [HUMAN needed]: `___`
- URL/parameter for page N — [HUMAN needed]: `___`
- Confirm "last page" indicator is `Page N of N` text — [HUMAN needed]: `___`

## Step 4 — Edge-case behavior — [HUMAN]

**Q12. Search for a company that returns nothing** (e.g. "Zzzz Fictitious Ltd"):
`___`

**Q13. Ambiguous name** (e.g. just "Systems"). Partial-match or exact-match? Contains vs Equals radio behavior?
`___`

**Q14. Rate-limit / throttle behavior** — 5 searches in 30s:
- Captcha appearing: `___`
- HTTP 429 / 503: `___`
- Session cookie required after first: `___`

## Step 5 — Detail page — [HUMAN]

Column header didn't obviously suggest a per-row detail link. Click any row title to test:

**Q15. Detail page URL pattern:** `___`
**Q16. Extra fields on the detail page:** `___`

## Step 6 — Bangla vs English

**Q17. Language toggle** — [via WebFetch]
**Bilingual.** Toggle labeled "Language English Bangla" appears in the header navigation. Exact URL parameter or session-based switch — [HUMAN needed]: `___`

**Q18. Digit form (0-9 vs ০-৯)** — [HUMAN needed]
Once you submit a search, note whether contract values / dates in the results table use Western digits or Bengali digits by default. `___`

## Step 7 — Terms of use

**Q19. robots.txt** — [via WebFetch]
**Not usable as guidance.** `https://www.eprocure.gov.bd/robots.txt` **302-redirects to `/SessionTimedOut.jsp`** — the domain's session manager treats robots.txt as session-required, which is technically broken. There is no meaningful `robots.txt` policy to follow. We rely on the T&C footer instead (Q20).

**Q20. Terms of use / acceptable use text** — [via WebFetch]
**Present.** Footer links: "Terms and Conditions" and "Disclaimer and Privacy Policy". Fetch the T&C page and quote any clauses that restrict automated access, redistribution, or reuse of the data — [HUMAN needed]:
- T&C URL: `___`
- Automated-access clauses: `___`
- Data-reuse clauses: `___`

## Step 8 — Confidence check

**Q21. Confidence rating (1-10)** — after you fill in Q3-Q9 from Network tab: `___`

---

## Pre-fill summary (what WebFetch answered)

- Entry point confirmed: `https://www.eprocure.gov.bd/resources/common/SearcheCMS.jsp` (public, no login)
- Form fields **identified** (15 total, with human-readable labels + inferred name attributes)
- Results table **10 columns identified** covering everything we need (title, entity, method, amount, dates, cert no, unique ID, status)
- Rich filter options far beyond what SoT §10.2 hinted at — we can filter by ministry, procurement type, work status (Completed vs Ongoing), date ranges
- Pagination exists ("Page N of N")
- Server-rendered form + AJAX-populated results
- Bilingual (English/Bangla) toggle in header
- robots.txt is broken (redirect to session-timeout); T&C page is the real policy source
- Terms and Conditions link exists in footer — needs reading before we ship

## What still needs a human (~10 min in Chrome/Firefox dev tools)

1. Open `https://www.eprocure.gov.bd/resources/common/SearcheCMS.jsp`
2. Open Network tab
3. Type "BRAC IT" (or your test company) into "Contract Awarded To", pick "Contains", pick Work Status "Completed"
4. Click Search
5. In Network tab, find the request (probably POST to a `.jsp` or `.do` endpoint):
   - Copy request URL → Q4
   - Copy form-data payload → Q5 (real `name` attributes)
   - Copy Cookie header → Q6
   - Copy Content-Type of the response → Q7 supplement
6. In Elements panel, right-click one result row → Inspect → copy outer HTML → Q9
7. Test with a fake name for empty state → Q12
8. Test ambiguous name → Q13
9. Rapid-fire 5 searches → Q14
10. Click a row title to test detail page → Q15
11. Toggle language → Q17
12. Note digit form on submitted results → Q18
13. Open T&C footer link → Q20

## When you finish

Commit this file with answers, mark `Project_Status.md` open_questions eExperience recon **DONE**, mark plan §6 Q8 answered → next session writes the eExperience adapter.

## Blocker candidates to watch for during the 10 min

- **Captcha on repeat searches** — blocks any adapter code, forces us to defer eExperience out of Phase 1 or ask BPPA for a data-partnership
- **T&C explicitly prohibits automated access** — legal risk, needs counsel input (already partly covered in `docs/data-residency-counsel-question.md`)
- **AJAX endpoint returns opaque binary or heavy JavaScript-generated markup** — parsing gets much harder, HTML fallback may not exist
- **Session cookie required for every request** — means our adapter has to establish a session first, more state to manage

If any of these appear, flag in the recon file. Better to know now than in the middle of adapter development.
