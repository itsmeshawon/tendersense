"use client";

import { useTransition } from "react";
import {
  deleteProfileAction,
  toggleProfileActiveAction,
} from "./actions";

export function ProfileRowActions({
  workspaceId,
  profileId,
  isActive,
}: {
  workspaceId: string;
  profileId: string;
  isActive: boolean;
}) {
  const [pending, startTransition] = useTransition();

  const toggle = () =>
    startTransition(() =>
      toggleProfileActiveAction(workspaceId, profileId, !isActive),
    );
  const remove = () => {
    if (!confirm("Delete this profile? This cannot be undone.")) return;
    startTransition(() => deleteProfileAction(workspaceId, profileId));
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className="rounded-md border px-2 py-1 hover:bg-accent disabled:opacity-50"
      >
        {isActive ? "Deactivate" : "Activate"}
      </button>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="rounded-md border border-red-300 px-2 py-1 text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
      >
        Delete
      </button>
    </div>
  );
}
