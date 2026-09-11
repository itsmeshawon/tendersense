import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { listMyWorkspaces } from "@/lib/workspaces/service";

/**
 * /dashboard is the post-login landing router. It bounces the user to
 * their workspaces list (or to the create-first-workspace form if they
 * have none). The visible product home lives at /workspaces.
 */
export default async function DashboardPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const workspaces = await listMyWorkspaces();
  redirect(workspaces.length === 0 ? "/workspaces/new" : "/workspaces");
}
