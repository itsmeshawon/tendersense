# eExperience Reconnaissance Checklist

**Status:** Prep task, ~20–30 min. Do this before Phase 1 PR #8 (the eExperience lookup) can be written. Fill in the answers below; commit this file. The adapter then codes against real selectors, not guesses.

**Why manual:** e-GP's public site occasionally changes markup, exposes different URLs for different search modes, and doesn't publish a schema. Someone needs to visit it once with a real company name and record what they find. Automating this recon step first is the wrong instinct — cheap human clicks now, code confidence later.

**Do not use Claude for this.** No web scraping from here; you (or a teammate) open a browser.

---

## What we need to know

The adapter has one job: given a company name, return a list of past contracts (with certificate numbers) so we can render them as a tick-list. To write that, we need:

1. The exact URL of the eExperience search / lookup surface.
2. The HTTP method and query-string / form-field shape.
3. The HTML structure of the response (list markup + per-row fields).
4. Whether the page is server-rendered HTML or requires JS/browser rendering.
5. How the site behaves for edge cases (no results, ambiguous names, throttling).

## Setup

- Browser with dev tools open (Network + Elements tabs). Chrome/Firefox both fine.
- A company name you know appears in the register. Recommended: **"BRAC IT Services"** — our pilot customer, ought to have public contracts.
- If not, try a well-known Bangladeshi IT company: **"DataSoft Systems"**, **"Beximco Computers"**, **"Enosis Solutions"**.

## Step 1 — Find the entry point

Start at `https://www.eprocure.gov.bd/` and locate the "Experience" or "eExperience" search feature. Likely paths:

- Top-nav Reports / Analytics / Statistics area
- A dedicated `/experience/` or `/resources/common/*Experience*.jsp` URL
- Cabinet Division reports linked from the footer

**Q1. Landing URL of the eExperience search form:**
`_______________________________________________`

**Q2. Is a login required to see the search form?** (Yes / No — if yes, we cannot use it — SoT §10.2 forbids authenticated ingestion)
`_______________________________________________`

## Step 2 — Submit a search

Enter a company name in whatever field the form provides. Submit. Note:

**Q3. HTTP method used** (check Network tab): GET / POST
`_______________________________________________`

**Q4. Full URL of the results page** (paste from address bar or Network tab):
`_______________________________________________`

**Q5. Query-string parameter names** (or POST form-field names) that carry the company name:
`_______________________________________________`

**Q6. Any hidden fields, session tokens, CSRF tokens, or captcha before submission?**
`_______________________________________________`

## Step 3 — Inspect the results page

**Q7. Is the results HTML server-rendered on page load, or does it fill in via AJAX after page load?**
Open the response in the Network tab. Search for the company name in the raw HTML response — is it there?
`_______________________________________________`

If AJAX: note the JSON/XHR endpoint URL and headers required. If server-rendered: continue below.

**Q8. Number of results returned for the tested company:**
`_______________________________________________`

**Q9. HTML structure of ONE result row** (right-click a row → Inspect → copy the outer HTML of the containing `<tr>` or `<div>`). Paste here, redacting any personal names:

```html



```

**Q10. Per-row fields we care about** — for each, note the CSS selector or column position:

| Field | Selector / position | Present? (Y/N) |
|---|---|---|
| Contract title | | |
| Procuring entity (ministry / division / org) | | |
| Contract value | | |
| Currency (implicit — BDT?) | | |
| Awarded date | | |
| Certificate / reference number | | |
| Duration | | |
| Detail-page link (URL to a per-contract page, if any) | | |

**Q11. Pagination shape** — does the results page paginate? If yes:

- Number of results per page: `___`
- URL/parameter for page N: `___`
- Any "last page" indicator we can detect? `___`

## Step 4 — Edge-case behavior

**Q12. Search for a company name that clearly returns nothing** (e.g. "Zzzz Fictitious Ltd"). What does the results page look like?
`_______________________________________________`

**Q13. Search for an ambiguous name** (e.g. just "Systems"). Does it partial-match or exact-match? Is there a way to force exact-match?
`_______________________________________________`

**Q14. Rate-limit / throttle behavior.** Submit 5 searches in a row within 30 seconds. Any:
- Captcha appearing? `___`
- HTTP 429 or 503 responses? `___`
- Session cookie required after first request? `___`

## Step 5 — Detail page (if per-contract detail pages exist)

If Q10 showed a detail-page link, click into one.

**Q15. Detail page URL pattern:**
`_______________________________________________`

**Q16. Extra fields on the detail page vs. the row summary** (only if adding meaningful info — most useful is the certificate number if it's not on the row):
`_______________________________________________`

## Step 6 — Bangla vs English

**Q17. Is the whole eExperience surface English-only, Bangla-only, or bilingual with a language toggle?** If a toggle, what's the URL parameter?
`_______________________________________________`

**Q18. Do numeric values (dates, amounts) use Western digits (0-9) or Bengali digits (০-৯)?**
`_______________________________________________`

## Step 7 — Terms of use

**Q19. Does the site have a robots.txt entry blocking `/experience/*` or equivalent?** Fetch `https://www.eprocure.gov.bd/robots.txt` and paste the relevant lines:
```



```

**Q20. Any "terms of use" or "acceptable use" text on the eExperience page?** Not a legal opinion — just note whether it exists so we can flag it in the counsel question.
`_______________________________________________`

## Step 8 — Confidence check

**Q21. If a colleague asked "can we ship an eExperience lookup adapter based on your recon?", how confident are you (1-10)?**
`___`

If below 7, name what would push it higher: `_______________`

---

## After you finish

1. Save this file, commit to `main` under `docs/eexperience-reconnaissance-checklist.md`.
2. Update `Project_Status.md` open_questions — mark the eExperience URL/selector reconnaissance as **done**.
3. Update `proposals/active/phase-1-source-ingestion/plan.md` §6 Q8 — mark as answered, link to this file.
4. In the next session, we can start writing the eExperience adapter against real answers.

If any answer surfaces a blocker (auth required, aggressive throttling, captcha), flag it in the wrap — it becomes a Phase 1 open thread, and we may need to defer the eExperience lookup out of Phase 1 into Phase 2.
