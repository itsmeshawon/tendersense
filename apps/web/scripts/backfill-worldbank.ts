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
  const result = await runSync(adapter, supabase, { maxPages: 50 });

  console.log("[backfill-worldbank]", result);
  if (result.status === "failed") process.exit(1);
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

main().catch((err) => {
  console.error("[backfill-worldbank] fatal:", err);
  process.exit(1);
});
