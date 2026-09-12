import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listFinancials } from "@/lib/financials/repository";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UpsertFinancialForm } from "./upsert-form";
import { FinancialRow } from "./row";

const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function fmtMoney(v: number | null): string {
  return v == null ? "—" : fmt.format(v);
}

export default async function FinancialsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const { id: workspaceId } = await params;
  const supabase = await createServerSupabaseClient();
  // RLS is admin-only on workspace_financials — non-admins see 0 rows
  // (empty state below explains it).
  const rows = await listFinancials(supabase, workspaceId);

  return (
    <main className="mx-auto flex min-h-svh max-w-4xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Financial capacity
          </h1>
          <p className="text-sm text-muted-foreground">
            Annual turnover, contract history, and audit status — used
            for tender eligibility rules like &ldquo;3-year turnover
            &ge; BDT 500M.&rdquo;
            <span className="font-medium text-foreground">
              {" "}Admin-only.
            </span>
          </p>
        </div>
        <Link href={`/workspaces/${workspaceId}`}>
          <Button variant="outline" size="sm">
            ← Workspace
          </Button>
        </Link>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Add or update fiscal year
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <UpsertFinancialForm workspaceId={workspaceId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-baseline justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              History ({rows.length})
            </CardTitle>
            {rows.length > 0 ? (
              <Badge variant="outline">
                Latest year: {rows[0]?.fiscal_year}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No fiscal years recorded yet. If you&rsquo;re signed in but
              still see this, you may not be a workspace admin —
              financial data is restricted to admins.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {rows.map((r) => (
                <FinancialRow
                  key={r.id}
                  row={r}
                  workspaceId={workspaceId}
                  formatted={{
                    annual_turnover: fmtMoney(r.annual_turnover),
                    net_worth: fmtMoney(r.net_worth),
                    liquid_assets: fmtMoney(r.liquid_assets),
                    largest_contract_value: fmtMoney(r.largest_contract_value),
                  }}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
