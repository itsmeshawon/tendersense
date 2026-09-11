# What we should change in the TenderSense plan

For the team meeting · 9 September 2026

The plan document is good. The way it says to build the product is right — keep the tools, the phases, the security setup, the testing, and the list of things we are not building.

What follows is what I think we should change, most important first.

---

## Must change

### 1. Read the right page on the e-GP website first

**Right now:** the plan says start with the BPPA advertisement pages, and only later use the main e-GP tender pages.

**Change it to:** start with the e-GP tender pages.

**Why:** the e-GP tender page already tells us what a company needs in order to bid — how much turnover, how big a past contract, how much cash in hand, how many years of experience. It is public and needs no login. That page is the whole reason our product works. If we start somewhere else, we get to the assessment stage with nothing to assess.

**Cost:** none. Same work, different order.

---

### 2. Stop turning eligibility into a percentage

**Right now:** one part of the plan says eligibility is a yes / no / partly / unknown answer. A later part turns it into a number, like "Eligibility: 78%".

**Change it to:** check the make-or-break requirements first. If the company fails one, say so plainly — "you cannot bid on this, and here is why". Only score the ones they can actually bid on.

**Why:** the two parts of the plan disagree with each other. And a number hides the problem — 78% sounds survivable when actually the company is disqualified. The better products in this market have stopped using a single score for this. They show a checklist instead.

**Cost:** small. Mostly deleting one table.

---

### 3. Use two ways of rating, not four

**Right now:** there is a match score out of 100, a second set of weighted scores, five recommendation levels, and three decision choices. That is four different scales on one screen.

**Change it to:** one **grade** (how good is this opportunity) and one **decision** (what we are doing about it). Keep the number behind the scenes for sorting.

**Why:** nobody can hold four scales in their head. We also promised simple grades instead of confusing percentages.

**Cost:** small, but we need to agree before the screens get built.

---

### 4. Let the system find the company's past work by itself

**Right now:** the company has to type in its own history by hand.

**Change it to:** the person types their company name. We look it up in the government's public records of awarded contracts. We show them what we found — contract names, values, dates — and they tick the ones that are theirs.

**Why:** this solves the hardest problem in the product. Nobody wants to fill in a long form before they see anything useful. And this is the best moment we can put in front of a room — watching a company's own history appear in a few seconds. No competitor anywhere can do this, because no other country publishes it this openly.

**Cost:** one more crawler and one screen. It must be a tick-list, not automatic — name matching will pick up wrong companies sometimes.

---

### 5. Read the government's procurement plans

**Right now:** not mentioned at all.

**Change it to:** also read the Annual Procurement Plans that government offices publish.

**Why:** these are published months before the tender comes out. So instead of telling someone about a tender today, we can tell them "this is coming in about four months, and here is the certificate you'll need before then." Everyone else in this market only finds out on publication day, same as everybody. This is the one thing we can do that nobody can copy.

**Cost:** one more crawler. For the hackathon, even one example is enough to show it.

---

## Should change

### 6. Keep a copy of the pages we read

The plan says don't store everything. That's right for big tender PDFs, but not for the notice pages themselves — those are tiny. Our reading code will have mistakes for months. If we didn't keep the page, every fix means going back and re-reading the whole website, which is slow and rude to the source.

### 7. Group the requirements by who deals with them

Legal · Money · Experience · Technical — instead of one long list. A team lead forwards different parts to different people. It is an afternoon of design work and makes the screen much more useful.

### 8. Show who won similar work before

The government also publishes who won each contract and for how much. So we can show "this office has awarded six similar jobs, four went to the same company." The data comes free with work we're already doing. It's the headline feature of the newest European product. Nobody in Bangladesh does it.

### 9. Let people describe their company in their own words

As well as picking from a list. A paragraph of plain writing gives us enough to start matching immediately. The list gives us what we need for eligibility. Do both. The newest competitor's entire sign-up is one paragraph.

### 10. Turn "we don't know" into a few short questions

When our checks can't answer something, ask the person — but only for the few things we couldn't work out, and only on opportunities they've already shortlisted. Save their answers so we never ask twice. This turns our weakest moment into something useful.

---

## Leave out of the first version

### 11. Profiles for individual consultants

It's a different product with different needs. It won't get finished properly alongside everything else.

### 12. Team features, reports and exports

Comments, tasks, owners, pipeline reports. Wait until BRAC IT tells us the matching is good enough to be worth organising a team around. Otherwise this phase will slip and take the rest with it.

---

## Things we need to decide

- **Where the data lives.** The free hosting we've chosen stores data outside Bangladesh. If the law requires it to stay in the country, we need to know now, not after launch.
- **How often the system checks for changes.** The scheduling tool we picked is fine once a day. It may not be enough when we start checking hourly near deadlines.
- **Who sets the grade boundaries,** and whether a customer can change them. This decides whether we need a settings screen.
- **Our one-line pitch.** Competitors have things like "stop paying to search, start paying to win" — the whole business in seven words. We don't have one yet. Worth an hour in the room.

---

## In short

The plan is the right way to **build** this. These changes are about what makes it **different from everyone else**.

Numbers 4 and 5 are the two things no competitor can copy, and right now neither is in the plan.

Numbers 1, 2 and 3 are fixes that get more expensive the longer we leave them.
