import type { SupabaseClient } from "@supabase/supabase-js";
import { insertNotification } from "./repository";
import {
  profileMatchesOpportunity,
  type MatchableOpportunity,
} from "./matching";
import type { MonitoringProfile } from "../monitoring/repository";

/**
 * When the runner writes a revision, fan out a notification to every
 * workspace whose active monitoring profile matches the opportunity.
 *
 * Best-effort — errors are logged but do not fail the runner (the
 * revision has already been persisted). Fanout runs synchronously in
 * the sync flow; batched writes are a Phase 6 follow-up.
 */
export async function fanoutRevisionNotifications(
  supabase: SupabaseClient,
  input: {
    revisionId: string;
    opportunity: MatchableOpportunity & {
      reference_no: string | null;
    };
    changedFields: string[];
  },
): Promise<{ workspacesNotified: number }> {
  const { data, error } = await supabase
    .from("monitoring_profiles")
    .select("*")
    .eq("is_active", true);
  if (error) {
    console.warn("[fanout] failed to load profiles:", error.message);
    return { workspacesNotified: 0 };
  }
  const profiles = (data as MonitoringProfile[] | null) ?? [];

  const matched = new Set<string>();
  for (const p of profiles) {
    if (matched.has(p.workspace_id)) continue; // one notification per workspace
    if (profileMatchesOpportunity(p, input.opportunity)) {
      matched.add(p.workspace_id);
    }
  }

  const hasDeadlineChange = input.changedFields.includes("deadline_at");
  const title = hasDeadlineChange ? "Deadline changed" : "Tender amended";
  const oppLabel =
    input.opportunity.reference_no ?? input.opportunity.title.slice(0, 80);

  let count = 0;
  for (const workspaceId of matched) {
    try {
      await insertNotification(supabase, {
        workspaceId,
        kind: "amendment",
        opportunityId: input.opportunity.id,
        revisionId: input.revisionId,
        title,
        body: `${input.opportunity.title} · ${oppLabel}`,
        metadata: {
          changed_fields: input.changedFields,
          source_key: input.opportunity.source_key,
        },
      });
      count += 1;
    } catch (err) {
      console.warn(
        "[fanout] insert failed for workspace",
        workspaceId,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return { workspacesNotified: count };
}
