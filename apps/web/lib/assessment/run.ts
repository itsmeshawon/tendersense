import type { SupabaseClient } from "@supabase/supabase-js";
import { computeAssessment } from "./compute";
import { loadWorkspaceSnapshot } from "./snapshot";
import type { AssessmentScore } from "./score";

export interface RunAssessmentInput {
  workspaceId: string;
  opportunityId: string;
  requestedBy: string;
  idempotencyKey?: string;
  /** SCORING_VERSION at run time (default 1; PR #11 bumps to 2). */
  scoringVersion?: number;
}

export interface RunAssessmentResult {
  assessmentId: string;
  score: AssessmentScore;
  requirementsCount: number;
}

/**
 * Synchronous assessment orchestrator. Requires a service-role client
 * (writes bypass RLS on `assessments` / `opportunity_requirements` /
 * `requirement_evaluations`). Quota enforcement is a separate concern
 * in PR #9 — this runner is the compute+persist unit.
 */
export async function runAssessment(
  supabase: SupabaseClient,
  input: RunAssessmentInput,
): Promise<RunAssessmentResult> {
  const startedAt = Date.now();
  const { workspaceId, opportunityId, requestedBy } = input;
  const scoringVersion = input.scoringVersion ?? 1;

  const oppRes = await supabase
    .from("opportunities")
    .select("description")
    .eq("id", opportunityId)
    .maybeSingle();
  if (oppRes.error) throw new Error(oppRes.error.message);
  const description = (oppRes.data?.description as string | null) ?? "";

  const snapshot = await loadWorkspaceSnapshot(supabase, workspaceId);
  const computed = computeAssessment(description, snapshot);

  const assessmentInsert = await supabase
    .from("assessments")
    .insert({
      workspace_id: workspaceId,
      opportunity_id: opportunityId,
      status: "running",
      extraction_method: "rules",
      extraction_meta: {
        source_text_len: computed.stats.sourceTextLen,
        rule_hits: computed.stats.ruleHits,
      },
      requested_by: requestedBy,
      scoring_version: scoringVersion,
      idempotency_key: input.idempotencyKey ?? null,
    })
    .select()
    .single();
  if (assessmentInsert.error) throw new Error(assessmentInsert.error.message);
  const assessmentId = (assessmentInsert.data as { id: string }).id;

  let requirementRows: Array<{ id: string }> = [];
  if (computed.requirements.length > 0) {
    const reqInsert = await supabase
      .from("opportunity_requirements")
      .insert(
        computed.requirements.map((r) => ({
          assessment_id: assessmentId,
          category: r.category,
          text: r.text,
          normalized_key: r.normalizedKey ?? null,
          mandatory: r.mandatory,
          threshold: r.threshold ?? null,
          source_location: r.sourceLocation ?? null,
          confidence: r.confidence,
          source: "rules",
        })),
      )
      .select();
    if (reqInsert.error) throw new Error(reqInsert.error.message);
    requirementRows =
      (reqInsert.data as Array<{ id: string }> | null) ?? [];

    const evalRows = computed.evaluations.map((e, i) => ({
      requirement_id: requirementRows[i]?.id,
      status: e.status,
      evidence_refs: e.evidenceRefs,
      reasoning: e.reasoning,
    }));
    if (evalRows.every((r) => r.requirement_id)) {
      const evalInsert = await supabase
        .from("requirement_evaluations")
        .insert(evalRows)
        .select();
      if (evalInsert.error) throw new Error(evalInsert.error.message);
    }
  }

  // Propagate the eligibility signal back onto opportunity_matches
  // so the two-signal list chip reflects fresh assessments without a
  // full match recompute. Silently no-ops if no match row exists yet.
  if (
    computed.score.eligibility !== "not_evaluated" &&
    computed.requirements.length > 0
  ) {
    const matchUpdate = await supabase
      .from("opportunity_matches")
      .update({
        eligibility: computed.score.eligibility,
        eligibility_computed_at: new Date().toISOString(),
      })
      .eq("workspace_id", workspaceId)
      .eq("opportunity_id", opportunityId);
    if (matchUpdate.error) throw new Error(matchUpdate.error.message);
  }

  const finalize = await supabase
    .from("assessments")
    .update({
      status: "succeeded",
      eligibility: computed.score.eligibility,
      eligibility_score:
        computed.score.eligibility === "not_evaluated"
          ? null
          : computed.score.eligibility_score,
      recommendation: computed.score.recommendation,
      recommendation_reason: computed.score.recommendation_reason,
      category_scores: computed.score.category_scores,
      extraction_meta: {
        source_text_len: computed.stats.sourceTextLen,
        rule_hits: computed.stats.ruleHits,
        took_ms: Date.now() - startedAt,
      },
      completed_at: new Date().toISOString(),
    })
    .eq("id", assessmentId)
    .select()
    .single();
  if (finalize.error) throw new Error(finalize.error.message);

  return {
    assessmentId,
    score: computed.score,
    requirementsCount: computed.requirements.length,
  };
}
