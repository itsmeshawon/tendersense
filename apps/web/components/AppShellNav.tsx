"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", matches: (p: string) => p === "/dashboard" },
  {
    href: "/opportunities",
    label: "Opportunities",
    matches: (p: string) => p.startsWith("/opportunities"),
  },
] as const;

/**
 * Primary nav pills. Client component only because we need
 * usePathname() to render the active state — no interaction beyond
 * anchor links.
 */
export function AppShellNav({
  activeWorkspaceId,
}: {
  activeWorkspaceId?: string;
}) {
  const pathname = usePathname();
  const workspaceHref = activeWorkspaceId
    ? `/workspaces/${activeWorkspaceId}`
    : "/workspaces";
  const isWorkspaceActive =
    pathname === "/workspaces" || pathname.startsWith("/workspaces/");

  return (
    <nav className="hidden items-center gap-1 text-sm md:flex">
      {LINKS.map((l) => {
        const active = l.matches(pathname);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rounded-md bg-accent/70 px-3 py-1.5 font-medium text-foreground"
                : "rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
            }
          >
            {l.label}
          </Link>
        );
      })}
      <Link
        href={workspaceHref}
        aria-current={isWorkspaceActive ? "page" : undefined}
        className={
          isWorkspaceActive
            ? "rounded-md px-3 py-1.5 font-medium text-foreground"
            : "rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
        }
      >
        Workspace
      </Link>
    </nav>
  );
}
