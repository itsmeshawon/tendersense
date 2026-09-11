import { createServerSupabaseClient } from "../supabase/server";
import {
  createWorkspaceViaRpc,
  listWorkspacesForCurrentUser,
  type Workspace,
  type WorkspaceType,
} from "./repository";

const WORKSPACE_TYPES: readonly WorkspaceType[] = [
  "individual",
  "organization",
] as const;

const MAX_NAME_LENGTH = 80;

export type CreateWorkspaceResult =
  | { ok: true; id: string }
  | { ok: false; message: string; field?: "name" | "type" };

export async function listMyWorkspaces(): Promise<Workspace[]> {
  const supabase = await createServerSupabaseClient();
  return listWorkspacesForCurrentUser(supabase);
}

export async function createMyWorkspace(input: {
  name: string;
  type: WorkspaceType;
}): Promise<CreateWorkspaceResult> {
  const name = input.name.trim();
  if (name.length === 0) {
    return { ok: false, message: "Workspace name is required.", field: "name" };
  }
  if (name.length > MAX_NAME_LENGTH) {
    return {
      ok: false,
      message: `Workspace name must be ${MAX_NAME_LENGTH} characters or fewer.`,
      field: "name",
    };
  }
  if (!WORKSPACE_TYPES.includes(input.type)) {
    return {
      ok: false,
      message: "Pick a workspace type.",
      field: "type",
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const id = await createWorkspaceViaRpc(supabase, { name, type: input.type });
    return { ok: true, id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, message };
  }
}
