"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "@/app/dashboard/actions";

/**
 * Avatar + dropdown for the current user. Shows email, workspaces
 * link, and sign-out. Kept lean — this is a utility affordance, not
 * a settings panel.
 */
export function AccountMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = (email[0] ?? "?").toUpperCase();

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        className="grid size-8 place-items-center rounded-full border border-border bg-background text-xs font-semibold text-foreground transition-colors hover:bg-accent"
      >
        {initial}
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-1 w-56 overflow-hidden rounded-md border border-border bg-popover text-sm shadow-lg"
        >
          <div className="border-b border-border/60 px-3 py-2 text-xs text-muted-foreground">
            Signed in as
            <div className="mt-0.5 truncate font-medium text-foreground">
              {email}
            </div>
          </div>
          <Link
            role="menuitem"
            href="/workspaces"
            className="block px-3 py-2 hover:bg-accent"
            onClick={() => setOpen(false)}
          >
            Switch workspace
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              role="menuitem"
              className="w-full px-3 py-2 text-left text-destructive hover:bg-destructive/10"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
