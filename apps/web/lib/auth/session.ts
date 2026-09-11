import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "../supabase/server";

export async function getServerUser(): Promise<User | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user ?? null;
}
