import { createClient } from "@supabase/supabase-js";
import { supabaseServiceRoleKey, supabaseUrl } from "./env";

/**
 * Service-role client. Bypasses RLS. Server-only.
 *
 * Never import from a "use client" file. The guard below will crash
 * fast if it ever runs in a browser bundle.
 */
export function createServiceRoleClient() {
  if (typeof window !== "undefined") {
    throw new Error(
      "server-only: createServiceRoleClient() must not run in the browser",
    );
  }
  return createClient(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
