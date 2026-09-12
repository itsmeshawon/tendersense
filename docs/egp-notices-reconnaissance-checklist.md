# e-GP Notices Reconnaissance Checklist

**Status:** Partially answered by WebFetch 2026-09-12. Remaining questions marked **[HUMAN]** need a browser + Network tab (~10 min).

**Target:** the Bangladesh e-GP **tender-notice** search (not eExperience — that's a different surface). This adapter will feed the `opportunities` table with fresh notices as they publish.

**Pattern:** same recon-first discipline that made the eExperience adapter work on first try after we captured a real response.

---

## Entry points

- **Basic search:** `https://www.eprocure.gov.bd/resources/common/StdTenderSearch.jsp?h=t` — [via WebFetch]
- **Advanced search:** `https://www.eprocure.gov.bd/resources/common/AllTenders.jsp?h=t` — [via WebFetch]
- Login: **not required** for either surface — [via WebFetch]

The adapter should target the **advanced search** URL (`AllTenders.jsp`) — richer filters, same result shape.

## Search form (Advanced) — fields identified

WebFetch could see labels + option lists. Actual HTML `name` attributes and exact submit path need the browser step.

| Label | Type | Options / notes |
|---|---|---|
| Ministry/Division/Organization | select | dropdown |
| Procuring Entity | select | default "-- Select Office --" |
| Procurement Nature | select | Goods · Works · Service · Physical Services |
| Procurement Type | select | NCT · ICT |
| Procurement Method | select | RFQ · OTM · LTM · TSTM · QCBS · LCS · SFB · DC · SBCQ · SSS · IC · CSO · DPM · OSTETM · RFQU · RFQL |
| Category | select | "Select Category" |
| Framework Agreement | select | Yes · No |
| Tender/Proposal ID | text | free text |
| Reference No | text | free text |
| From Publishing Date | date | |
| To Publishing Date | date | |
| From Closing Date | date | |
| To Closing Date | date | |

Also visible: a **status tab bar** — `Live | Archive | Cancelled | All` — that filters the result set by status.

**Notable absence:** no keyword search on title/description. Users filter by ministry + method + date range, not by keyword. If we want keyword search in our own `/opportunities` UI, it happens on our normalized data, not passed through to e-GP.

## Result table — 6 columns identified

Every column we need for `NormalizedOpportunity` (SoT §14):

| Column | Our field |
|---|---|
| S. No. | skip |
| Tender/Proposal ID, Reference No, Public Status | externalId + referenceNo + status |
| Procurement Nature, Title | procurementCategory + title |
| Ministry, Division, Organization, PE | ministryName + agencyName + procuringEntityName |
| Type, Method | procurementCategory + procurementMethod |
| Publishing Date and Time, Closing Date and Time | publicationAt + deadlineAt |

Pagination visible as "Page N of M" — same shape as eExperience.

## Still needs a browser (~10 min in Chrome/Firefox dev tools)

Do these in order and paste back what you find at each numbered step.

### Step 1 — Open the advanced form

Navigate to: `https://www.eprocure.gov.bd/resources/common/AllTenders.jsp?h=t`

- **Open dev tools first**, Network tab, check "Preserve log"
- Confirm the page loads without login

### Step 2 — Capture the form field `name` attributes

Right-click one input at a time → **Inspect** → copy the `name` attribute:

- `Ministry/Division/Organization` select → `name="___"`
- `Procuring Entity` select → `name="___"`
- `Procurement Nature` select → `name="___"`
- `Procurement Type` select → `name="___"`
- `Procurement Method` select → `name="___"`
- `Tender/Proposal ID` input → `name="___"`
- `Reference No` input → `name="___"`
- `From Publishing Date` input → `name="___"`
- `To Publishing Date` input → `name="___"`
- `From Closing Date` input → `name="___"`
- `To Closing Date` input → `name="___"`
- The status tab (Live/Archive/Cancelled/All) — is it a hidden input, a URL param, or a JS-driven state? `___`

Also: paste the raw `<input>` / `<select>` HTML for one of them so I can verify id/name conventions:
```

```

### Step 3 — Submit a broad search

Fill in a minimal filter set that'll return real results:
- **Procurement Nature:** Goods
- **From Publishing Date:** 30 days ago (any date)
- Leave everything else default
- Click Search

Watch the Network tab. Find the request that fired.

- **Request URL:** `___`
- **Method (GET/POST):** `___`
- **Response Content-Type:** `___`
- Form-data payload (all key-value pairs — paste the Network → Payload tab):
```

```
- Any `JSESSIONID` cookie present? Yes/No: `___`
- Any hidden fields sent that weren't visible in the form? `___`

### Step 4 — Capture one result row's HTML

In the results table, right-click a row → **Inspect** → in Elements panel, right-click the highlighted `<tr>` → **Copy** → **Copy outerHTML**. Paste it:

```

```

That single row tells me:
- The row class (compare to eExperience's `bgColor-white` / `bgColor-Green`)
- How multi-line cells are structured (dates + IDs likely wrap with `<br>`)
- Whether title has a `<a href>` to a detail page (very likely — that's the external URL our `sourceUrl` needs)
- Amount / value fields — SoT §16.14 wants `estimatedValueMin` and `estimatedValueMax`; e-GP might expose a single amount

### Step 5 — Pagination

- Total pages visible ("Page 1 of X"): `___`
- Click "Next" (page 2). What request fires? Same URL + `pageNo=2`, or a different pagination param? `___`

### Step 6 — Status tabs

Click through **Live / Archive / Cancelled / All** — which of these does our adapter need? Live only, or All?
- What request param controls this? `___`

### Step 7 — Detail page (5 sec)

Click any row's title link. What URL pattern does it navigate to?
- URL pattern: `___`

### Step 8 — Response shape sanity

Is the response HTML fragment shape similar to eExperience? Specifically:
- Does the response start with bare `<tr>` (fragment) or a full `<html>` document? `___`
- Row `class="…"` value(s)? `___`

If it's a fragment like eExperience, we'll reuse the wrap-in-`<table>` trick. If it's a full document, direct parse.

---

## What WebFetch already answered (no need to re-check)

- Both entry points load without login
- 6-column result table with all fields we need
- Pagination exists ("Page N of M")
- Advanced search has 13 filter fields
- No keyword search on title (users filter by ministry/method/date range)
- Status tabs: Live / Archive / Cancelled / All

## What this recon unblocks

Once you paste answers, the e-GP notices adapter can be written **first try** — same discipline that saved us hours on eExperience. Estimated adapter size: ~150 lines (comparable to WB adapter + eExperience client combined).

## Blocker candidates to watch for during the 10 min

- **JavaScript-only form submission** — no fallback POST endpoint. Would need to reverse-engineer the JS. Unlikely for a government portal; they usually keep POST endpoints working.
- **Captcha on 3+ searches** — flag if you see it. Might force us to add a per-hour rate limit.
- **T&C automated-access clause** — already flagged as open thread on the eprocure.gov.bd footer; applies to this adapter too.
- **Response requires logged-in session** — we saw this doesn't apply to the form itself, but maybe to results. Flag if the POST returns a login redirect.

## When you're done

Paste the answers. I'll integrate into the checklist + write the adapter in the same session if there's time.
