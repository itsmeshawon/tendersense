# Pilot Demo Script — BRAC IT

**Status:** Draft — refine after Phase 1 ships, before the actual demo.
**Audience:** BRAC IT Services decision-makers (procurement lead + bid team + likely a director).
**Duration:** 20 minutes. 12 min demo, 8 min Q&A. Anything longer loses the room.
**Setting:** Assume in-person, projected screen, one laptop, one presenter. Wifi may be flaky — see §7 fallback plan.
**Goal:** Get a signed pilot agreement, or a scheduled second meeting with more of their team, not a "we'll think about it."

---

## 1. The one-line pitch

> **TenderSense finds the right tenders earlier, tells you whether you qualify, and helps you decide before it is too late.**

Say it once at the start, once at the end. Do not embellish. If someone says "so it's like [competitor]?", answer: "It's what [competitor] doesn't do — it starts by knowing your company, not by throwing every tender at you."

## 2. The demo has two peaks

Do not try to demo everything. Two moments carry the whole meeting:

- **Peak 1: the eExperience unlock** (§4). Type "BRAC IT" into an empty profile screen. In under five seconds, their own past government contracts appear on screen with certificate numbers. They tick which ones are theirs. Their profile is done.
- **Peak 2: fresh opportunities appear on their own** (§5). Show that WB and e-GP notices land in the discover feed automatically, with amendment detection when a deadline changes.

Everything else is context around these two moments.

## 3. Setup — the 60-second opening

*"Right now, what happens when a new government IT tender is published?"*

Let them describe it. They will say some version of: someone checks eprocure.gov.bd every morning, forwards interesting notices to a WhatsApp group, argues over whether to bid, misses the deadline sometimes, wins some, loses more.

*"TenderSense turns that into three steps. Discover. Assess. Decide. Today I'll show you Discover — that's what we've built. Assess and Decide are next."*

Do not overclaim. If they ask when Assess ships, say "8–12 weeks after pilot start, guided by which requirements you tell us matter most." Vague honesty beats specific fiction.

## 4. Peak 1 — profile onboarding via eExperience

Open a fresh browser window. Sign in as a demo BRAC IT workspace admin (allowlist-seeded ahead of the meeting).

- Land on `/workspaces/new`.
- Type **"BRAC IT Services"** into the workspace name field.
- Explain: *"To match tenders to a company, we need to know what the company has done. Normally that's a long form. We do it differently."*
- Advance to the profile-onboarding screen (this UI lands in Phase 1 PR #8 per the plan).
- Type **"BRAC IT"** into the company-name lookup.
- Press Enter. Wait for the eExperience lookup to return.
- Rows appear: contracts BRAC IT has actually won, straight from e-GP's public register. Certificate numbers included.
- Point at the screen: *"These are real. Public record. We didn't type any of this."*
- Tick a subset of 3–5 rows. Say *"You'd normally tick the ones that are yours, in case name-matching pulled in a similar company. But everything here is yours."*
- Click **Save**. Profile is now non-empty, with real project history, in under 20 seconds.

**Why this lands:**

- Bid teams have never seen this before. Every competitor asks them to fill out a form.
- The data is theirs — no vendor sold it to us, we didn't upload anything.
- It signals we understand the market: we know eExperience exists and how to use it. That establishes credibility more than any slide.

**What can go wrong:**

- Name is ambiguous or e-GP returns nothing → tick some rows in advance from a screenshot, keep it moving.
- e-GP is down or slow → fallback in §7.

## 5. Peak 2 — Discover feed with amendment detection

Navigate to the workspace's `/opportunities` list (Phase 1 bonus PR).

- Show ~10 fresh notices: mix of e-GP (Bangladesh, in Bangla + English) and World Bank (regional).
- Point to publication dates: *"These landed automatically. Nobody on your team went to a website. TenderSense pulls e-GP every four hours and World Bank once a day."*
- Click into one notice — show the detail page with source URL. Explain: *"We always link back to the official notice. TenderSense summarizes. The government portal is the source of truth."*
- Show a notice that has a revision (pre-seed one for the demo). Point to the "amendment" indicator: *"Deadline moved from October 15 to October 22 yesterday. If this had been shortlisted, an alert would have gone to the workspace."*

**Why this lands:**

- Discover works today. It's live, not a mockup.
- The amendment detection is the specific pain they know — someone submitted on the old deadline and lost the bid.
- Emphasizes "on their own" — no manual monitoring.

**What you are not saying yet:**

- Nothing about matching. Do not say "these are the ones ranked for you" if Phase 3 hasn't shipped. Say "these are new — all of them."

## 6. What's next — the 90-second forward look

*"You've seen Discover. Two more steps are ahead."*

- **Assess.** Point at a notice. *"Once this is on your shortlist, TenderSense will tell you whether you qualify. Turnover requirements, past-project count, cash-in-hand. Green / yellow / red. If you fail a make-or-break requirement, we say so — no percentage that hides disqualification."*
- **Decide.** *"Pursue, hold, or decline. With a paper trail — who decided, when, why. So the argument in the WhatsApp group has a record."*

*"We're building both. Pilot access means you shape them. What you tell us matters most gets built first."*

## 7. Fallback plans

**Wifi dies mid-demo:**

- Have the discover list + eExperience result screenshots in a local slide deck, keyboard shortcut ready.
- Walk through screenshots with the same narration. Less exciting but still lands the two peaks.
- Bring back to live demo when connection returns.

**e-GP is down at demo time:**

- The eExperience lookup gracefully returns "we couldn't reach e-GP right now" — do not let it look broken.
- Pre-seed a workspace with 5 BRAC IT projects manually the day before. Say *"On a normal day, this fills in from e-GP in a few seconds. Today the source is having a moment. Here's what it looks like once it's saved:"* and show the pre-seeded profile.

**Vercel deploy is red:**

- Fall back to localhost running against hosted Supabase. Same data. Nobody notices.

**Someone asks a hostile question ("what stops us building this ourselves"):**

- *"Nothing. It's public data. The value is having built it, not having access to the data. Every quarter you spend building means quarters of missed tenders. That's the trade."*
- Do not get defensive. Do not oversell.

## 8. What to have ready before the meeting

- [ ] Real BRAC IT workspace pre-created, allowlist row for the demo email
- [ ] Empty profile state for Peak 1 — or a screencast of the empty→filled transition as backup
- [ ] `/opportunities` seeded with at least 20 real notices from the last two weeks (WB + e-GP)
- [ ] One notice with a real amendment (or a mocked amendment inserted via SQL) for the "amendment detection" moment
- [ ] Local slide deck of screenshots for the wifi-fails fallback
- [ ] Local dev server running against hosted Supabase as the Vercel-fails fallback
- [ ] The one-line pitch (§1) written on a card in your pocket — say it verbatim, twice

## 9. What NOT to demo

Every one of these is a temptation. Resist.

- **Matching UI** — not built. If they ask, say "next phase."
- **Assessment / eligibility engine** — not built.
- **Team features, comments, decisions log** — deferred per ADR 0006 §7. If they ask about multi-user, say "single-user Pro for pilot; multi-user comes after we know what matching looks like for your team."
- **The AI story** — under-index on this. TenderSense is deterministic where it can be (matching, requirement extraction where the source is structured). Talking about AI too much in Bangladesh gov-adjacent pitches raises data-residency questions we haven't answered yet.
- **Data residency in the abstract** — if they ask, answer specifically: *"Right now we store public procurement notices plus your team's login. Both categories are non-sensitive. When we add document upload — which is post-pilot — we'll answer this question with counsel input."*

## 10. Closing — the 30-second ask

*"What we need from you: two people from your bid team using it for one procurement cycle. Sixty days. Free. We watch what you do. Every friction point you hit shapes the next version. At the end of the cycle, you tell us whether it saved time, and whether the pilot converts to a paid contract."*

Then stop talking.

## 11. Post-demo follow-up

Within 24 hours, send:

- One-page summary (not a full deck) — three screenshots, five bullet points, next-step calendar link
- No feature list. No pricing yet.
- Ask them: which two people on your bid team should we onboard?

## 12. Open threads

- eExperience URL + selector reconnaissance is not done (Phase 1 plan §6 Q8). Cannot demo Peak 1 until this is confirmed. **Blocker for scheduling any demo.**
- The `/opportunities` list is optional in the Phase 1 plan (§6 Q5). If we don't ship it, Peak 2 is much weaker — Discover with no visible list is just "trust us, it's ingesting." **Strongly recommend shipping the list.**
- Grade vocabulary sanity check with a BD product manager (open question) — nice-to-have before the demo but doesn't block if we're demoing Discover only.
- Pre-seeded BRAC IT workspace + amendment example need to be prepared the day before the demo. Add to a demo-prep checklist.

## 13. When to rewrite this

- After Phase 1 ships and eExperience actually works end-to-end (some steps will change based on the real UX).
- After the first demo — capture what worked, what didn't, revise before the second.
- If SoT-Changes revisits scope again — check that the "not yet demoing" list still matches what's built vs not.
