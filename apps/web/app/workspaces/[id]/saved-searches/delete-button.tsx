"use client";

import { useTransition } from "react";
import { deleteSavedSearchAction } from "./actions";

export function DeleteButton({
  workspaceId,
  id,
}: {
  workspaceId: string;
  id: string;
}) {
  const [pending, startTransition] = useTransition();
  const remove = () => {
    if (!confirm("Delete this saved search?")) return;
    startTransition(() => deleteSavedSearchAction(workspaceId, id));
  };
  return (
    <button
      type="button"
      onClick={remove}
      disabled={pending}
      className="shrink-0 rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
    >
      Delete
    </button>
  );
}
