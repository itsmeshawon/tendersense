import type { SupabaseClient } from "@supabase/supabase-js";
import { upsertMatch, upsertMatchesBulk } from "./repository";
import { loadWorkspaceProfile } from "./profile-loader";
import { scoreOpportunity } from "./score";
import { SCORING_VERSION, type ScorableOpportunity } from "./types";

/** Default lookback window (Phase 3 v2 §Q4 decision: 90 days). */
const DEFAULT_LOOKBACK_DAYS = 90;
const DEFAULT_CHUNK_SIZE = 100;

export interface RecomputeForWorkspaceOptions {
  lookbackDays?: number;
  chunkSize?: number;
}

/**
 * Recompute all opportunity matches for a single workspace across
 * the last N days. Chunked so a large scoring pass doesn't stall
 * a Vercel serverless invocation.
 */
export async function recomputeForWorkspace(
  supabase: SupabaseClient,
  workspaceId: string,
  opts: RecomputeForWorkspaceOptions = {},
): Promise<{ matched: number }> {
  const lookbackDays = opts.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
  const chunkSize = opts.chunkSize ?? DEFAULT_CHUNK_SIZE;

  const profile = await loadWorkspaceProfile(supabase, workspaceId);
  const cutoff = new Date(
    Date.now() - lookbackDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from("opportunities")
    .select(
      "id, source_key, country_code, sector, title, description, publication_at",
    )
    .gte("publication_at", cutoff)
    .order("publication_at", { ascending: false });
  if (error) throw new Error(error.message);

  const opps = (data as ScorableOpportunity[] | null) ?? [];
  let matched = 0;
  // Score in memory, upsert in batches — one round-trip per chunk
  // instead of one per opportunity. On the hosted pipeline this drops
  // recompute latency from ~30s to ~2s for the pilot volume.
  for (let i = 0; i < opps.length; i += chunkSize) {
    const chunk = opps.slice(i, i + chunkSize);
    const rows = chunk.map((opp) => {
      const result = scoreOpportunity(profile, opp);
      return {
        workspaceId,
        opportunityId: opp.id,
        score: result.score,
        grade: result.grade,
        reasons: result.reasons,
        concerns: result.concerns,
        scoringVersion: SCORING_VERSION,
      };
    });
    await upsertMatchesBulk(supabase, rows);
    matched += rows.length;
  }
  return { matched };
}

/**
 * When a single opportunity lands (create or amendment), rescore it
 * for every workspace that could plausibly care. MVP heuristic: any
 * workspace with at least one active monitoring profile.
 *
 * Best-effort — errors on a single workspace are logged but do not
 * block the runner.
 */
/**
 * Sweep every workspace and rescore its match rows against the current
 * `SCORING_VERSION`. Used once per weight-model bump (see ADR 0025 for
 * the v1 → v2 rebalance) — not a hot path.
 *
 * Best-effort: an error on one workspace is logged and the loop
 * continues so a single bad profile doesn't strand the fleet.
 */
export async function recomputeAllWorkspaces(
  supabase: SupabaseClient,
  opts: RecomputeForWorkspaceOptions = {},
): Promise<{ workspaces: number; matched: number }> {
  const { data, error } = await supabase.from("workspaces").select("id");
  if (error) throw new Error(error.message);
  const ids = ((data as Array<{ id: string }> | null) ?? []).map((r) => r.id);
  let total = 0;
  for (const id of ids) {
    try {
      const { matched } = await recomputeForWorkspace(supabase, id, opts);
      total += matched;
    } catch (err) {
      console.warn(
        "[recompute] failed for workspace",
        id,
        err instanceof Error ? err.message : err,
      );
    }
  }
  return { workspaces: ids.length, matched: total };
}

export async function recomputeForOpportunity(
  supabase: SupabaseClient,
  opp: ScorableOpportunity,
): Promise<{ workspacesUpdated: number }> {
  const { data, error } = await supabase
    .from("monitoring_profiles")
    .select("workspace_id")
    .eq("is_active", true);
  if (error) {
    console.warn("[recompute] failed to list active profiles:", error.message);
    return { workspacesUpdated: 0 };
  }
  const workspaceIds = Array.from(
    new Set(
      ((data as Array<{ workspace_id: string }> | null) ?? []).map(
        (r) => r.workspace_id,
      ),
    ),
  );
  let updated = 0;
  for (const wsId of workspaceIds) {
    try {
      const profile = await loadWorkspaceProfile(supabase, wsId);
      const result = scoreOpportunity(profile, opp);
      await upsertMatch(supabase, {
        workspaceId: wsId,
        opportunityId: opp.id,
        score: result.score,
        grade: result.grade,
        reasons: result.reasons,
        concerns: result.concerns,
        scoringVersion: SCORING_VERSION,
      });
      updated += 1;
    } catch (err) {
      console.warn(
        "[recompute] failed for workspace",
        wsId,
        err instanceof Error ? err.message : err,
      );
    }
  }
  return { workspacesUpdated: updated };
}
