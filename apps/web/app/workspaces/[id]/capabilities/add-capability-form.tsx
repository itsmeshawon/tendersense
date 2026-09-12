"use client";

import { useState, useTransition } from "react";
import { addCapabilitiesAction } from "./actions";

export function AddCapabilityForm({
  workspaceId,
  options,
}: {
  workspaceId: string;
  options: Array<{ key: string; label: string }>;
}) {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const submit = () => {
    if (selected.size === 0) return;
    const labels = Array.from(selected);
    startTransition(async () => {
      await addCapabilitiesAction(workspaceId, labels);
      setSelected(new Set());
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <li key={o.key}>
            <label
              className={`flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm hover:bg-accent ${
                selected.has(o.key) ? "border-primary bg-accent" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(o.key)}
                onChange={() => toggle(o.key)}
                className="h-4 w-4"
              />
              <span>{o.label}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={pending || selected.size === 0}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {pending
            ? "Adding…"
            : selected.size === 0
              ? "Add capabilities"
              : `Add ${selected.size} capabilit${selected.size === 1 ? "y" : "ies"}`}
        </button>
        {pending ? (
          <p className="text-xs text-muted-foreground">
            Recomputing your grades — this can take a few seconds.
          </p>
        ) : null}
      </div>
    </div>
  );
}
