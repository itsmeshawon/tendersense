import { createClient } from "@supabase/supabase-js";
import { createBppaAdapter } from "../lib/ingest/adapters/bppa";
import { runSync } from "../lib/ingest/runner";

async function main() {
  const url = required("SUPABASE_URL");
  const key = required("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const adapter = createBppaAdapter({ fetchImpl: fetch, category: "goods" });
  const result = await runSync(adapter, supabase, { maxPages: 5 });

  console.log("[sync-bppa]", result);
  if (result.status === "failed") process.exit(1);
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

main().catch((err) => {
  console.error("[sync-bppa] fatal:", err);
  process.exit(1);
});
