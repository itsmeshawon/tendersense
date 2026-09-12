# Phase 1 Finalization Checklist

**Audience:** @mewking2099 (or whoever picks up Phase 1 exit)
**Estimated time:** 1–2 hours after PRs merge — mostly ~90 lines of glue + one release tag.

This document is a **paint-by-numbers execution plan** for closing Phase 1. Everything substantial is already written. What remains is:

1. Merge the 6 open PRs (any order — they're independent)
2. Write a small "sync scripts" PR that wires adapters into the runner
3. Write a small "cron workflows" PR for GitHub Actions
4. Run backfill once to populate hosted
5. Verify `/opportunities` on prod shows real data
6. Tag `v0.2.0-phase1`

---

## Step 0 — Prerequisites

- `git checkout main && git pull` — get latest
- Local Supabase running (`supabase start` from repo root) if you want to test locally before pushing
- Node 22, npm — same as today

## Step 1 — Merge the PR queue (any order)

Six independent PRs. Merge each after CI green + a quick smell-test:

| PR | Focus of review |
|---|---|
| #15 | WB adapter — read fixture-driven tests; no live behavior yet |
| #17 | eExperience UI — verify `Import from e-GP` button on `/workspaces` list works against the Vercel preview |
| #19 | Runner + persistence — abstract; check that failure-partial-success semantics match ADR 0007 |
| #21 | `/workspaces/[id]` detail page — new route; smoke-check the preview |
| #23 | e-GP notices adapter — same shape as WB, real-fragment fixture |
| #25 | `/opportunities` filter bar — click through preview URL with query params |

After each merges, `git pull` locally so subsequent PRs see a fresh baseline.

**Squash-merge every one**, delete the branch. That's the workflow per ADR 0005.

## Step 2 — Sync scripts PR (~90 lines total)

Create branch `feat/phase1-sync-scripts` off latest `main`.

### 2.1 — Add `tsx` to devDependencies

```bash
cd apps/web
npm install --save-dev tsx
```

Update `apps/web/package.json` scripts block:

```json
"sync:worldbank": "tsx scripts/sync-worldbank.ts",
"sync:egp": "tsx scripts/sync-egp.ts",
"backfill:worldbank": "tsx scripts/backfill-worldbank.ts"
```

### 2.2 — Create `apps/web/scripts/sync-worldbank.ts`

```typescript
/**
 * WB cron entry point. Called by GitHub Actions daily (see
 * .github/workflows/sync-worldbank.yml). Runs one page pass and exits.
 */
import { createClient } from "@supabase/supabase-js";
import { createWorldBankAdapter } from "../lib/ingest/adapters/worldbank";
import { runSync } from "../lib/ingest/runner";

async function main() {
  const url = required("SUPABASE_URL");
  const key = required("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const adapter = createWorldBankAdapter({ fetchImpl: fetch, pageSize: 1000 });
  const result = await runSync(adapter, supabase, { maxPages: 5 });

  console.log("[sync-worldbank]", result);
  if (result.status === "failed") process.exit(1);
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

main().catch((err) => {
  console.error("[sync-worldbank] fatal:", err);
  process.exit(1);
});
```

### 2.3 — Create `apps/web/scripts/sync-egp.ts`

Identical structure. Import `createEgpNoticesAdapter` from `../lib/ingest/adapters/egp-notices`. `pageSize: 10` (e-GP servlet default; larger sizes untested).

### 2.4 — Create `apps/web/scripts/backfill-worldbank.ts`

Same as `sync-worldbank.ts` but with `maxPages: 50` — one-off catch-up. Run manually before the first cron.

### 2.5 — Test locally

```bash
# apps/web with .env.local pointing at hosted or local Supabase
npm run sync:worldbank
```

Expect log line like `[sync-worldbank] { status: 'success', runId: '...', recordsFetched: 1000, ... }`. Verify with:

```sql
select count(*), max(publication_at) from public.opportunities where source_key = 'world_bank';
```

Should return > 0 rows. Then `/opportunities` on Vercel prod will render actual data.

### 2.6 — Open PR

Title: `feat(sync): sync scripts wire adapters to runner`
Body: mentions this checklist by name, notes ~40-line total surface.

## Step 3 — Cron workflows PR (~50 lines YAML)

Create branch `feat/phase1-cron-workflows` off latest `main`.

### 3.1 — Create `.github/workflows/sync-worldbank.yml`

```yaml
name: Sync World Bank

on:
  schedule:
    - cron: "0 2 * * *"   # 02:00 UTC daily (~08:00 BD)
  workflow_dispatch: {}

jobs:
  sync:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/web
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: apps/web/package-lock.json
      - run: npm ci
      - name: Sync
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: npm run sync:worldbank
```

### 3.2 — Create `.github/workflows/sync-egp.yml`

Same but `cron: "0 */4 * * *"` (every 4 hours) and `npm run sync:egp`.

### 3.3 — GitHub Secrets

Repo → Settings → Secrets and variables → Actions → New repository secret:
- `SUPABASE_URL` = `https://tatkdyjukxzibvaqpoau.supabase.co` (from your Vercel env vars)
- `SUPABASE_SERVICE_ROLE_KEY` = the JWT-format service_role key from Supabase Dashboard → Project Settings → API Keys

Do NOT commit these — they live in Actions Secrets only.

### 3.4 — Test the workflow

Push the branch, open PR, wait for CI green. **Manually trigger via workflow_dispatch** on the Actions tab. Watch the run: should complete in 30-90s and populate `opportunities`. If it fails, error appears in the Actions log.

### 3.5 — Open PR

Title: `feat(cron): GitHub Actions daily WB + 4h e-GP sync`
Merge after CI green + one manual dispatch confirms success.

## Step 4 — Verify end-to-end

After steps 2 + 3 both merged and dispatched once:

1. Vercel prod at https://tendersense-delta.vercel.app/login
2. Sign in
3. Navigate to `/opportunities`
4. **You should see real WB + e-GP tenders**
5. Try filter combinations: `/opportunities?country=BD&deadline=30`
6. Click through to `/workspaces/<id>/onboarding`, search Beximco or Sunnah Construction, tick, import
7. Navigate to `/workspaces/<id>` — see imported projects

If all seven work, **Peak 2 of the pilot demo is live**.

## Step 5 — Tag `v0.2.0-phase1`

```bash
git checkout main && git pull
git tag -a v0.2.0-phase1 -m "Phase 1 — Source Ingestion complete

- WB + e-GP tender-notice adapters
- eExperience on-demand lookup + profile-onboarding UI
- Runner with revision detection + partial-success semantics
- /opportunities list with source/country/deadline/status filters
- /workspaces/[id] detail with imported projects
- GitHub Actions cron: daily WB, 4h e-GP
- Ingestion writes to hosted; both peaks of the pilot demo functional

Definition of MVP Done (SoT §114): items 1-6 checked."
git push origin v0.2.0-phase1
```

## Step 6 — Update `Project_Status.md`

- `current_phase`: `"Phase 2 — Discovery (planning)"`
- `active_plans`: add `proposals/active/phase-2-discovery/plan.md (planning)` (if Phase 2 plan is drafted)
- `next_action`: something like "Draft Phase 2 plan: BPPA + NOA + APP adapters, monitoring profiles, saved searches"

Commit direct to `main` under the wrap exception.

---

## Follow-ups after Phase 1 exits

Not needed for tagging, but worth queueing for Phase 2:

- **e-GP procNature / procMethod numeric mapping** — currently sends empty (returns all natures). To filter server-side, capture: `1` = Goods (confirmed), 2/3/4 = ? Ask Mohabbat to do a 5-min dev-tools recon.
- **Revision auto-numbering** — `runner.ts` hardcodes `revisionNo: 1`; second amendment on same opportunity will UNIQUE-violate. Fix: compute `max(revision_no)+1` in `writeRevision`.
- **Timezone handling** — e-GP times treated as UTC; they're really BDT (UTC+6). Convert on ingest per SoT §72.
- **Rate limiting on eExperience lookup** — Phase 1 §6 Q10 still open.

## Open threads Mohabbat should carry forward

- BRAC IT name mismatch on e-GP (blocks pilot demo scheduling)
- PII rule formal sign-off (encoded in code + tests, awaiting user + counsel)
- Data-residency counsel question (drafted at `docs/data-residency-counsel-question.md`, awaiting filing)
- T&C automated-access clause at eprocure.gov.bd — read before production launch
- Grade vocabulary sanity check with BD product manager — Phase 3 prep

Full list in `Project_Status.md → open_questions`.

## If anything blows up

- **Sync script fails with permission denied** — service_role key isn't in Actions Secrets, or Supabase RLS policy got tightened. Check `supabase.from('opportunities').select()` works from service-role client.
- **e-GP returns 429** — throttle. Increase interval between requests in the adapter or drop cron cadence.
- **Vercel prod `/opportunities` empty after sync** — cron ran but Vercel's server component may be caching. Force revalidate via `revalidatePath("/opportunities")` in a follow-up, or wait for ISR expiry.

---

Everything else lives in `log.md` (session-by-session narrative) or `decisions/` (ADRs).
