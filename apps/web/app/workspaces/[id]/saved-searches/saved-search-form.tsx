"use client";

import { useActionState } from "react";
import { saveSearchAction, type SavedSearchState } from "./actions";

export function SavedSearchForm({
  workspaceId,
  queryString,
}: {
  workspaceId: string;
  queryString: string;
}) {
  const [state, formAction, pending] = useActionState<
    SavedSearchState,
    FormData
  >(
    async (prev, fd) => saveSearchAction(workspaceId, prev, fd),
    { status: "idle" },
  );

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="flex flex-col gap-1 text-xs">
        <span className="font-semibold text-foreground">Name</span>
        <input
          type="text"
          name="name"
          required
          placeholder='e.g. "BD infra open"'
          className="w-full rounded-md border px-3 py-2 text-sm sm:w-72"
        />
      </label>
      <input type="hidden" name="query_string" value={queryString} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save search"}
      </button>
      {state.status === "error" ? (
        <p className="text-xs text-red-700 dark:text-red-400">
          {state.message}
        </p>
      ) : null}
      {state.status === "created" ? (
        <p className="text-xs text-green-700 dark:text-green-400">Saved.</p>
      ) : null}
    </form>
  );
}
