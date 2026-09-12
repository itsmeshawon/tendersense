"use client";

import { useTransition } from "react";
import { markAllReadAction } from "./actions";

export function MarkAllRead({ workspaceId }: { workspaceId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => startTransition(() => markAllReadAction(workspaceId))}
      disabled={pending}
      className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
    >
      {pending ? "Marking…" : "Mark all read"}
    </button>
  );
}
