"use client";

import { useTransition } from "react";
import { removeFinancialAction } from "./actions";
import type { FinancialRow as Row } from "@/lib/financials/repository";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function FinancialRow({
  row,
  workspaceId,
  formatted,
}: {
  row: Row;
  workspaceId: string;
  formatted: {
    annual_turnover: string;
    net_worth: string;
    liquid_assets: string;
    largest_contract_value: string;
  };
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
        <Cell label="Turnover" value={formatted.annual_turnover} />
        <Cell label="Net worth" value={formatted.net_worth} />
        <Cell label="Liquid" value={formatted.liquid_assets} />
        <Cell label="Largest contract" value={formatted.largest_contract_value} />
      </dl>
    </li>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  );
}
