import type { SupabaseClient } from "@supabase/supabase-js";

export type FinancialRow = {
  id: string;
  workspace_id: string;
  fiscal_year: number;
  currency: string;
  annual_turnover: number | null;
  net_worth: number | null;
  liquid_assets: number | null;
  largest_contract_value: number | null;
  is_audited: boolean;
  evidence_document_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export async function listFinancials(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<FinancialRow[]> {
  const { data, error } = await supabase
    .from("workspace_financials")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("fiscal_year", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as FinancialRow[] | null) ?? [];
}

export interface UpsertFinancialInput {
  workspaceId: string;
  createdBy: string;
  fiscalYear: number;
  currency: string;
  annualTurnover?: number | null;
  netWorth?: number | null;
  liquidAssets?: number | null;
  largestContractValue?: number | null;
  isAudited?: boolean;
}

export async function upsertFinancial(
  supabase: SupabaseClient,
  input: UpsertFinancialInput,
): Promise<FinancialRow> {
  const { data, error } = await supabase
    .from("workspace_financials")
    .upsert(
      {
        workspace_id: input.workspaceId,
        created_by: input.createdBy,
        fiscal_year: input.fiscalYear,
        currency: input.currency,
        annual_turnover: input.annualTurnover ?? null,
        net_worth: input.netWorth ?? null,
        liquid_assets: input.liquidAssets ?? null,
        largest_contract_value: input.largestContractValue ?? null,
        is_audited: input.isAudited ?? false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,fiscal_year" },
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as FinancialRow;
}

export async function deleteFinancial(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("workspace_financials")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}
