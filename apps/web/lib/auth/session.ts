import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "../supabase/server";

/**
 * Wrapped in React's per-request `cache()` so a single render pass
 * (page + layout + shell) only hits `supabase.auth.getUser()` once,
 * not three times. Meaningful latency win on every authenticated
 * page.
 */
export const getServerUser = cache(async (): Promise<User | null> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user ?? null;
});
