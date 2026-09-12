import type { SupabaseClient } from "@supabase/supabase-js";

export type WorkspaceType = "individual" | "organization";
export type WorkspacePlan = "free" | "pro";

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  workspace_type: WorkspaceType;
  plan: WorkspacePlan;
  owner_user_id: string;
  country_code: string | null;
  profile_completion: number;
  created_at: string;
  updated_at: string;
};

export async function listWorkspacesForCurrentUser(
  supabase: SupabaseClient,
): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as Workspace[] | null) ?? [];
}

export async function createWorkspaceViaRpc(
  supabase: SupabaseClient,
  input: { name: string; type: WorkspaceType },
): Promise<string> {
  const { data, error } = await supabase.rpc("create_workspace", {
    p_name: input.name,
    p_workspace_type: input.type,
  });

  if (error) throw new Error(error.message);
  return data as string;
}

export async function getWorkspaceById(
  supabase: SupabaseClient,
  id: string,
): Promise<Workspace | null> {
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Workspace | null) ?? null;
}

export type WorkspaceMember = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: "admin" | "member" | "viewer";
  status: "active" | "invited" | "disabled";
  joined_at: string | null;
  created_at: string;
};

export async function listWorkspaceMembers(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<WorkspaceMember[]> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("joined_at", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data as WorkspaceMember[] | null) ?? [];
}

export type WorkspaceMemberWithProfile = WorkspaceMember & {
  display_name: string | null;
  avatar_url: string | null;
};

/**
 * Same as `listWorkspaceMembers` but also fetches display names + avatars
 * from the profiles table. Two queries instead of a PostgREST embed —
 * workspace_members.user_id → auth.users(id) has no direct FK to
 * profiles.id, so PostgREST can't infer the join.
 *
 * The profiles RLS policy only lets a caller read their own row, so
 * other members' names may come back as null. UI must handle that.
 */
export async function listWorkspaceMembersWithProfile(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<WorkspaceMemberWithProfile[]> {
  const members = await listWorkspaceMembers(supabase, workspaceId);
  if (members.length === 0) return [];

  const userIds = Array.from(new Set(members.map((m) => m.user_id)));
  const { data: profileRows, error: profErr } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", userIds);
  if (profErr) throw new Error(profErr.message);

  const byId = new Map<string, { display_name: string | null; avatar_url: string | null }>(
    ((profileRows as Array<{ id: string; display_name: string | null; avatar_url: string | null }> | null) ?? []).map((p) => [p.id, p]),
  );

  return members.map((m) => {
    const profile = byId.get(m.user_id);
    return {
      ...m,
      display_name: profile?.display_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
    };
  });
}
