import type { ExperienceRecord } from "../experience/types";
import { createServerSupabaseClient } from "../supabase/server";
import { createServiceRoleClient } from "../supabase/service";
import {
  insertProjects,
  type ProjectInsert,
} from "./projects-repository";
import { bucketProjectToCapabilities } from "../matching/taxonomy";
import { upsertWorkspaceCapabilities } from "../matching/repository";
import { recomputeForWorkspace } from "../matching/recompute";

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

  // Cold-start capability auto-derive (Phase 3 plan v2 §2b + Q7).
  // Bucket each imported project against the fixed taxonomy; write the
  // union as `source='auto_derived'` capabilities so the user can review
  // + confirm on /capabilities. This is what stops a fresh workspace
  // from grading every tender as "Not yet ranked" / uniform D.
  const suggested = new Map<string, { hits: number; confidence: number }>();
  for (const rec of records) {
    const buckets = bucketProjectToCapabilities({
      title: rec.title,
      description: null,
    });
    for (const b of buckets) {
      const existing = suggested.get(b.key);
      if (!existing || b.hits > existing.hits) {
        suggested.set(b.key, { hits: b.hits, confidence: b.confidence });
      }
    }
  }

  if (suggested.size > 0) {
    try {
      const admin = createServiceRoleClient();
      await upsertWorkspaceCapabilities(
        admin,
        workspaceId,
        Array.from(suggested.entries()).map(([label, meta]) => ({
          label,
          source: "auto_derived",
          confidence: meta.confidence,
        })),
      );
      // Fire recompute with the fresh capability vector so grades on
      // /opportunities update on the next visit.
      await recomputeForWorkspace(admin, workspaceId);
    } catch (err) {
      console.warn(
        "[projects-service] auto-derive / recompute failed:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  return { imported };
}
