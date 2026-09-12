import Link from "next/link";
import { getServerUser } from "@/lib/auth/session";
import { listMyWorkspaces } from "@/lib/workspaces/service";
import { NotificationsBell } from "@/components/NotificationsBell";
import { AppShellNav } from "./AppShellNav";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { AccountMenu } from "./AccountMenu";

/**
 * Global chrome for every authenticated page. Sticky top bar with:
 * - Brand mark (left)
 * - Primary nav (Dashboard · Opportunities · Workspace)
 * - Workspace switcher (if more than one)
 * - Notifications + account menu (right)
 *
 * Pages that use this shell must NOT render their own <header> with
 * navigation buttons — the shell owns nav vocabulary. Page content
 * still owns its own h1 + contextual actions on the right of the
 * content column.
 */
export async function AppShell({
  children,
  currentWorkspaceId,
}: {
  children: React.ReactNode;
  currentWorkspaceId?: string;
}) {
  const user = await getServerUser();
  const workspaces = user ? await listMyWorkspaces() : [];
  const activeWorkspace =
    workspaces.find((w) => w.id === currentWorkspaceId) ?? workspaces[0];

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm font-semibold tracking-tight"
          >
            <span
              aria-hidden
              className="grid h-6 w-6 place-items-center rounded-md bg-primary text-primary-foreground"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              T
            </span>
            <span className="font-[family-name:var(--font-heading)] text-base">
              TenderSense
            </span>
          </Link>

          <AppShellNav
            activeWorkspaceId={activeWorkspace?.id}
          />

          <div className="ml-auto flex items-center gap-2">
            {workspaces.length > 1 ? (
              <WorkspaceSwitcher
                workspaces={workspaces.map((w) => ({
                  id: w.id,
                  name: w.name,
                  plan: w.plan,
                }))}
                activeId={activeWorkspace?.id ?? null}
              />
            ) : null}
            <NotificationsBell />
            {user ? (
              <AccountMenu email={user.email ?? "account"} />
            ) : null}
          </div>
        </div>
      </header>
      {children}
    </>
  );
}
