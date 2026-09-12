"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  deleteFinancial,
  upsertFinancial,
} from "@/lib/financials/repository";

function num(v: FormDataEntryValue | null): number | null {
  if (typeof v !== "string" || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function upsertFinancialAction(
  workspaceId: string,
  formData: FormData,
): Promise<void> {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const year = Number(formData.get("fiscal_year"));
  if (!Number.isFinite(year) || year < 2000 || year > 2100) return;
  const currency = String(formData.get("currency") ?? "USD").trim() || "USD";

  const supabase = await createServerSupabaseClient();
  await upsertFinancial(supabase, {
    workspaceId,
    createdBy: user.id,
    fiscalYear: year,
    currency,
    annualTurnover: num(formData.get("annual_turnover")),
    netWorth: num(formData.get("net_worth")),
    liquidAssets: num(formData.get("liquid_assets")),
    largestContractValue: num(formData.get("largest_contract_value")),
    isAudited: formData.get("is_audited") === "on",
  });
  revalidatePath(`/workspaces/${workspaceId}/financials`);
}

export async function removeFinancialAction(
  workspaceId: string,
  id: string,
): Promise<void> {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const supabase = await createServerSupabaseClient();
  await deleteFinancial(supabase, id);
  revalidatePath(`/workspaces/${workspaceId}/financials`);
}
