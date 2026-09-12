"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";

interface WorkspaceOption {
  id: string;
  name: string;
  plan: string;
}

/**
 * Compact workspace switcher. Only rendered when the user is a member
 * of more than one workspace. Preserves the current path when
 * switching (updates the ?workspace= query only when the current
 * path is a workspace-scoped route).
 */
export function WorkspaceSwitcher({
  workspaces,
  activeId,
}: {
  workspaces: WorkspaceOption[];
  activeId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Prefer the workspace inferred from the URL (?workspace= or the
  // /workspaces/[id]/ path segment) over the server-rendered activeId
  // prop — that prop is stale as soon as the user navigates client-
  // side. Pattern matches SoT §Q7 workspace-context resolution.
  const urlWorkspaceId = (() => {
    const qs = searchParams.get("workspace");
    if (qs && workspaces.some((w) => w.id === qs)) return qs;
    const match = pathname.match(/^\/workspaces\/([0-9a-f-]{36})(?:\/|$)/);
    if (match && workspaces.some((w) => w.id === match[1])) return match[1];
    return null;
  })();
  const active =
    workspaces.find((w) => w.id === (urlWorkspaceId ?? activeId)) ??
    workspaces[0];

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function switchTo(id: string) {
    setOpen(false);
    // If the current path is workspace-scoped, jump to its hub.
    // Otherwise preserve pathname and just swap ?workspace=.
    if (pathname.startsWith("/workspaces/")) {
      router.push(`/workspaces/${id}`);
      return;
    }
    const usp = new URLSearchParams(searchParams);
    usp.set("workspace", id);
    router.push(`${pathname}?${usp.toString()}`);
  }

  if (!active) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-accent/60"
      >
        <span className="max-w-[10rem] truncate">{active.name}</span>
        <span
          className={
            active.plan === "pro"
              ? "rounded-sm bg-primary/10 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary"
              : "rounded-sm bg-muted px-1 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
          }
        >
          {active.plan}
        </span>
        <ChevronDown className="size-3.5 opacity-60" aria-hidden />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute right-0 top-full z-40 mt-1 w-56 overflow-hidden rounded-md border border-border bg-popover shadow-lg"
        >
          {workspaces.map((w) => (
            <button
              key={w.id}
              type="button"
              role="option"
              aria-selected={w.id === active.id}
              onClick={() => switchTo(w.id)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <span className="truncate">{w.name}</span>
              <span className="flex items-center gap-2">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {w.plan}
                </span>
                {w.id === active.id ? (
                  <Check className="size-3.5 text-primary" aria-hidden />
                ) : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
