"use client";

import { useTransition } from "react";
import { confirmCapabilityAction, removeCapabilityAction } from "./actions";
import { CAPABILITY_TAXONOMY } from "@/lib/matching/taxonomy";
import type { WorkspaceCapabilityRow } from "@/lib/matching/repository";

export function CapabilityRow({
  workspaceId,
  row,
}: {
  workspaceId: string;
  row: WorkspaceCapabilityRow;
}) {
  const [pending, startTransition] = useTransition();

  const displayLabel =
    CAPABILITY_TAXONOMY.find((c) => c.key === row.label)?.label ?? row.label;
  const isSuggestion = row.source === "auto_derived";

  return (
    <li className="flex items-center justify-between gap-4 rounded-md border p-3 text-sm">
      <div className="min-w-0 flex-1">
        <p className="font-medium">{displayLabel}</p>
        <p className="text-xs text-muted-foreground">
          {isSuggestion ? (
            <>
              Suggested from your imported projects
              {row.confidence !== null && row.confidence !== undefined
                ? ` · confidence ${(row.confidence * 100).toFixed(0)}%`
                : ""}
            </>
          ) : (
            "Confirmed"
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-xs">
        {isSuggestion ? (
          <button
            type="button"
            onClick={() =>
              startTransition(() =>
                confirmCapabilityAction(workspaceId, row.label),
              )
            }
            disabled={pending}
            className="rounded-md border px-2 py-1 hover:bg-accent disabled:opacity-50"
          >
            Confirm
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            if (!confirm(`Remove "${displayLabel}"?`)) return;
            startTransition(() =>
              removeCapabilityAction(workspaceId, row.id),
            );
          }}
          disabled={pending}
          className="rounded-md border border-red-300 px-2 py-1 text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
        >
          Remove
        </button>
      </div>
    </li>
  );
}
