"use client";

import { useTransition } from "react";
import { removeExpertAction } from "./actions";
import type { ExpertRow } from "@/lib/experts/repository";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const AVAILABILITY_LABEL: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  short_term: "Short-term",
  on_demand: "On-demand",
};

export function ExpertRowUI({
  row,
  workspaceId,
}: {
  row: ExpertRow;
  workspaceId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between gap-4 rounded-md border p-3 text-sm">
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {row.name}
          {row.role ? (
            <span className="ml-2 text-xs text-muted-foreground">
              · {row.role}
            </span>
          ) : null}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {row.years_experience !== null ? (
            <Badge variant="secondary">{row.years_experience}y experience</Badge>
          ) : null}
          {row.availability ? (
            <Badge variant="outline">
              {AVAILABILITY_LABEL[row.availability] ?? row.availability}
            </Badge>
          ) : null}
          {row.sectors.map((s) => (
            <Badge key={s} variant="outline">
              {s}
            </Badge>
          ))}
        </div>
      </div>
      <Button
        variant="outline"
        size="xs"
        disabled={pending}
        className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
        onClick={() => {
          if (!confirm(`Remove ${row.name}?`)) return;
          startTransition(() => removeExpertAction(workspaceId, row.id));
        }}
      >
        Remove
      </Button>
    </li>
  );
}
