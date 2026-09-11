import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./env";

/**
 * RLS-respecting server client. Reads and writes the Supabase session
 * cookie via next/headers. Use from Server Components, Server Actions,
 * and Route Handlers.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // cookies().set() throws in a read-only Server Component.
          // The middleware refreshes the session on every request, so
          // it's safe to ignore here.
        }
      },
    },
  });
}
