"use client";

import { useTransition } from "react";
import { addCapabilityAction } from "./actions";

export function AddCapabilityForm({
  workspaceId,
  options,
}: {
  workspaceId: string;
  options: Array<{ key: string; label: string }>;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const label = new FormData(e.currentTarget).get("label");
        if (typeof label !== "string" || !label) return;
        startTransition(() => addCapabilityAction(workspaceId, label));
        (e.currentTarget as HTMLFormElement).reset();
      }}
      className="flex flex-col gap-2 sm:flex-row sm:items-end"
    >
      <label className="flex flex-1 flex-col gap-1 text-xs">
        <span className="font-semibold text-foreground">Capability</span>
        <select
          name="label"
          required
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">— select —</option>
          {options.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add capability"}
      </button>
    </form>
  );
}
