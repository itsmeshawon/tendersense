"use client";

import { useTransition } from "react";
import { markAllReadAction } from "./actions";
import { Button } from "@/components/ui/button";

export function MarkAllRead({ workspaceId }: { workspaceId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => startTransition(() => markAllReadAction(workspaceId))}
      disabled={pending}
    >
      {pending ? "Marking…" : "Mark all read"}
    </Button>
  );
}
