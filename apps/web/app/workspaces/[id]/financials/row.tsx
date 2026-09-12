"use client";

import { useTransition } from "react";
import { removeFinancialAction } from "./actions";
import type { FinancialRow as Row } from "@/lib/financials/repository";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function FinancialRow({
  row,
  workspaceId,
  format,
}: {
  row: Row;
  workspaceId: string;
  format: (n: number) => string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="rounded-md border p-4 text-sm">
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <p className="text-lg font-semibold">{row.fiscal_year}</p>
          <Badge variant="secondary">{row.currency}</Badge>
          {row.is_audited ? (
            <Badge variant="outline">Audited</Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Unaudited
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="xs"
          disabled={pending}
          className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
          onClick={() => {
            if (!confirm(`Remove FY${row.fiscal_year}?`)) return;
            startTransition(() => removeFinancialAction(workspaceId, row.id));
          }}
        >
          Remove
        </Button>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
        <Cell label="Turnover" v={row.annual_turnover} f={format} />
        <Cell label="Net worth" v={row.net_worth} f={format} />
        <Cell label="Liquid" v={row.liquid_assets} f={format} />
        <Cell label="Largest contract" v={row.largest_contract_value} f={format} />
      </dl>
    </li>
  );
}

function Cell({
  label,
  v,
  f,
}: {
  label: string;
  v: number | null;
  f: (n: number) => string;
}) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono">{v !== null ? f(v) : "—"}</dd>
    </div>
  );
}
