"use client";

import { useTransition } from "react";
import { upsertFinancialAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CURRENT_YEAR = new Date().getFullYear();

export function UpsertFinancialForm({ workspaceId }: { workspaceId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        startTransition(async () => {
          await upsertFinancialAction(workspaceId, fd);
          form.reset();
        });
      }}
      className="grid grid-cols-1 gap-3 sm:grid-cols-3"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fiscal_year">Fiscal year *</Label>
        <Input
          id="fiscal_year"
          name="fiscal_year"
          type="number"
          required
          defaultValue={CURRENT_YEAR}
          min={2000}
          max={2100}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="currency">Currency *</Label>
        <Input
          id="currency"
          name="currency"
          required
          defaultValue="USD"
          maxLength={3}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="annual_turnover">Annual turnover</Label>
        <Input
          id="annual_turnover"
          name="annual_turnover"
          type="number"
          step="0.01"
          placeholder="25000000"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="net_worth">Net worth</Label>
        <Input
          id="net_worth"
          name="net_worth"
          type="number"
          step="0.01"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="liquid_assets">Liquid assets</Label>
        <Input
          id="liquid_assets"
          name="liquid_assets"
          type="number"
          step="0.01"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="largest_contract_value">Largest contract</Label>
        <Input
          id="largest_contract_value"
          name="largest_contract_value"
          type="number"
          step="0.01"
        />
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-3">
        <input type="checkbox" name="is_audited" className="h-4 w-4" />
        <span>These figures are from audited statements</span>
      </label>
      <div className="sm:col-span-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save fiscal year"}
        </Button>
      </div>
    </form>
  );
}
