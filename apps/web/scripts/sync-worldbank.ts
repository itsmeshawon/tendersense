import { createClient } from "@supabase/supabase-js";
import { createWorldBankAdapter } from "../lib/ingest/adapters/worldbank";
import { runSync } from "../lib/ingest/runner";

async function main() {
  const url = required("SUPABASE_URL");
  const key = required("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // pageSize 50 keeps per-run count manageable while the new adapter
  // (search.worldbank.org) is fresh in prod. maxPages 5 = up to 250
  // most-recent notices per cron pass — well inside the 15-min timeout.
  const adapter = createWorldBankAdapter({ fetchImpl: fetch, pageSize: 50 });
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
