"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createSavedSearch,
  deleteSavedSearch,
} from "@/lib/saved-searches/repository";

export type SavedSearchState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "created"; id: string };

/**
 * Which URL params on /opportunities we allow-list into a saved search.
 * Others (like internal debug flags) get dropped.
 */
const ALLOWED_PARAMS = new Set([
  "q",
  "country",
  "source",
  "status",
  "deadline",
  "sort",
]);

function extractQueryParams(raw: string): Record<string, string> {
  const usp = new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw);
  const out: Record<string, string> = {};
  for (const [k, v] of usp.entries()) {
    if (!ALLOWED_PARAMS.has(k)) continue;
    const trimmed = v.trim();
    if (!trimmed) continue;
    out[k] = trimmed;
  }
  return out;
}

export async function saveSearchAction(
  workspaceId: string,
  _prev: SavedSearchState,
  formData: FormData,
): Promise<SavedSearchState> {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { status: "error", message: "Name is required" };
  const rawParams = String(formData.get("query_string") ?? "");
  const params = extractQueryParams(rawParams);

  const supabase = await createServerSupabaseClient();
  try {
    const row = await createSavedSearch(supabase, {
      workspaceId,
      createdBy: user.id,
      name,
      queryParams: params,
    });
    revalidatePath(`/workspaces/${workspaceId}/saved-searches`);
    return { status: "created", id: row.id };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Failed to save",
    };
  }
}

export async function deleteSavedSearchAction(
  workspaceId: string,
  id: string,
): Promise<void> {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const supabase = await createServerSupabaseClient();
  await deleteSavedSearch(supabase, id);
  revalidatePath(`/workspaces/${workspaceId}/saved-searches`);
}
