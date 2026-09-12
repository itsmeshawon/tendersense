# Grade calibration — BRAC IT bid team session

**Status:** Template — awaiting session with BRAC IT
**Scoring version at labeling:** 1
**Methodology:** ADR 0019

---

## How to use this doc

1. Pull ~12 tenders from `public.opportunities` — draw from all four grade bands so we're not just labeling A-grades. Suggested SQL:

```sql
with sampled as (
  select o.title, o.source_key, m.grade, m.score, o.reference_no, o.id
  from public.opportunity_matches m
  join public.opportunities o on o.id = m.opportunity_id
  where m.workspace_id = '<BRAC-IT-workspace-uuid>'
    and m.grade in ('A', 'B', 'C', 'D')
  order by m.grade, random()
)
(select * from sampled where grade = 'A' limit 3)
union all (select * from sampled where grade = 'B' limit 3)
union all (select * from sampled where grade = 'C' limit 3)
union all (select * from sampled where grade = 'D' limit 3);
```

2. Fill in the table below, one row per tender.

3. For each disagreement (bid-team-yes but grade-D, or bid-team-no but grade-A), write a short reason in the notes column.

4. After the session, do the analysis under "What we learned." If a systematic pattern emerges, open a follow-up PR that adjusts `DIMENSION_WEIGHTS` and bumps `SCORING_VERSION`. Otherwise, accept the weights as-is and add the disagreement pattern to "Known limitations."

---

## Labeled tenders

| # | Title (truncated) | Source | Computed grade | Score | Bid team: bid? | Bid team's reasoning | Agree? |
|---|---|---|---|---|---|---|---|
| 1 | | | | | | | |
| 2 | | | | | | | |
| 3 | | | | | | | |
| 4 | | | | | | | |
| 5 | | | | | | | |
| 6 | | | | | | | |
| 7 | | | | | | | |
| 8 | | | | | | | |
| 9 | | | | | | | |
| 10 | | | | | | | |
| 11 | | | | | | | |
| 12 | | | | | | | |

---

## What we learned

(To be filled in after the session. Look for systematic patterns:)

- **Capability weighting** — does the bid team say "yes" on tenders where the capability signal was low? Sign the capability weight is *too high*.
- **Country weighting** — do they say "no" on BD-country tenders because BD is table stakes, not a differentiator? Sign to *lower* country's weight.
- **Sector coverage** — do they say "yes" on tenders where sector was inapplicable (nulls on e-GP/BPPA rows)? Sign we need to derive sectors from title on those adapters.
- **Excluded keywords** — do they say "no" on tenders that no filter caught? Add those to their default excluded_keywords.

---

## Known limitations documented from this session

(To be filled in.)

---

## Actions taken

- [ ] Weights adjusted? If yes, PR link + `SCORING_VERSION` bump
- [ ] Known limitations added to plan
- [ ] Next calibration date scheduled (default: 3 months)
