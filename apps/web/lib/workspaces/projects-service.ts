import type { ExperienceRecord } from "../experience/types";
import { createServerSupabaseClient } from "../supabase/server";
import {
  insertProjects,
  type ProjectInsert,
} from "./projects-repository";

/**
 * Map one e-GP eExperience record to a `public.projects` insert row.
 *
 * The e-GP dataset gives us more fields than `projects` stores — we
 * keep the load-bearing ones as structured columns (name, dates, value,
 * cert number) and pack the rest into `summary` so nothing is lost.
 */
export function experienceRecordToProjectInsert(
  workspaceId: string,
  rec: ExperienceRecord,
): ProjectInsert {
  const clientName = [
    rec.division,
    rec.procuringEntity,
  ]
    .filter((s) => s && s.length > 0)
    .join(" — ");

  const summary = [
    `Ref: ${rec.referenceNo}`,
    `Tender ID: ${rec.tenderId}`,
    `Method: ${rec.procurementNature} / ${rec.procurementType} / ${rec.procurementMethod}`,
    `Ministry: ${rec.ministry}`,
    `Detail URL: https://www.eprocure.gov.bd${rec.detailUrl}`,
  ]
    .filter((s) => s && !s.endsWith("undefined"))
    .join("\n");

  return {
    workspace_id: workspaceId,
    name: rec.title,
    client_name: clientName || rec.procuringEntity,
    country_code: "BD",
    sector: rec.procurementNature,
    start_date: rec.contractStartDate,
    end_date: rec.contractEndDate,
    contract_value: rec.contractAmount,
    currency: "BDT",
    summary,
    services: null,
    technologies: null,
    evidence_credential_number: rec.experienceCertificateNo,
    is_public: false,
  };
}

export interface ImportResult {
  imported: number;
}

/**
 * Persist a batch of picked eExperience records into `public.projects`
 * for the given workspace. RLS enforces workspace membership at insert
 * time via `projects_member_insert` (migration 0011).
 */
export async function importExperienceRecords(
  workspaceId: string,
  records: ExperienceRecord[],
): Promise<ImportResult> {
  if (records.length === 0) return { imported: 0 };
  const rows = records.map((r) =>
    experienceRecordToProjectInsert(workspaceId, r),
  );
  const supabase = await createServerSupabaseClient();
  const imported = await insertProjects(supabase, rows);
  return { imported };
}
