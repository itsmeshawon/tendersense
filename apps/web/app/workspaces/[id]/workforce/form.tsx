"use client";

import { useTransition } from "react";
import { saveWorkforceAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function WorkforceForm({
  workspaceId,
  defaults,
  roles,
}: {
  workspaceId: string;
  defaults: {
    totalEmployees: number | null;
    roleCounts: Record<string, number>;
  };
  roles: Array<{ key: string; label: string }>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => saveWorkforceAction(workspaceId, fd));
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1.5 sm:max-w-xs">
        <Label htmlFor="total_employees">Total employees</Label>
        <Input
          id="total_employees"
          name="total_employees"
          type="number"
          min={0}
          defaultValue={defaults.totalEmployees ?? ""}
          placeholder="e.g. 320"
        />
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold tracking-tight text-foreground">
          Role breakdown (optional)
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {roles.map((r) => (
            <div key={r.key} className="flex flex-col gap-1.5">
              <Label htmlFor={`role_${r.key}`}>{r.label}</Label>
              <Input
                id={`role_${r.key}`}
                name={`role_${r.key}`}
                type="number"
                min={0}
                defaultValue={defaults.roleCounts[r.key] ?? ""}
              />
            </div>
          ))}
        </div>
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save workforce"}
        </Button>
      </div>
    </form>
  );
}
