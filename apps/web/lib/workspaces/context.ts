import { cookies } from "next/headers";

/**
 * Server-side helper that resolves the "active" workspace for a page
 * from three inputs, in priority order:
 *
 *   1. `?workspace=<id>` query param (explicit intent, wins).
 *   2. `ts_workspace` cookie (last-picked, persists across pages).
 *   3. Fallback: the first workspace in the list.
 *
 * Every page that renders workspace-scoped data should call this
 * instead of hardcoding `workspaces[0]`. That's what makes the
 * top-bar switcher actually feel sticky.
 */
export const WORKSPACE_COOKIE = "ts_workspace";

export async function resolveActiveWorkspaceId<
  T extends { id: string },
>(input: {
  workspaces: T[];
  requestedId?: string | null;
}): Promise<T | undefined> {
  const { workspaces, requestedId } = input;
  if (workspaces.length === 0) return undefined;

  // 1. explicit query param
  if (requestedId) {
    const match = workspaces.find((w) => w.id === requestedId);
    if (match) return match;
  }

  // 2. cookie
  const jar = await cookies();
  const cookieId = jar.get(WORKSPACE_COOKIE)?.value;
  if (cookieId) {
    const match = workspaces.find((w) => w.id === cookieId);
    if (match) return match;
  }

  // 3. fallback
  return workspaces[0];
}
