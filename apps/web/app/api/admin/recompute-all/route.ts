import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { recomputeAllWorkspaces } from "@/lib/matching/recompute";

/**
 * One-shot admin endpoint used to re-score every workspace's match
 * rows against the current `SCORING_VERSION` — see ADR 0025 for the
 * v1 → v2 sweep this exists to service.
 *
 * Not part of the app UI. Gated by `ADMIN_TASK_TOKEN` (an env var the
 * operator sets before running). Bypasses RLS via the service-role
 * client; every request writes hundreds of rows, so it must be called
 * from a trusted context only.
 *
 * Usage (once, from a terminal with the token in hand):
 *
 *     curl -X POST -H "x-admin-token: $ADMIN_TASK_TOKEN" \
 *       https://tendersense.app/api/admin/recompute-all
 */
export async function POST(request: Request) {
  const token = process.env.ADMIN_TASK_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "ADMIN_TASK_TOKEN not configured" },
      { status: 500 },
    );
  }
  const provided = request.headers.get("x-admin-token");
  if (provided !== token) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = createServiceRoleClient();
  const started = Date.now();
  const result = await recomputeAllWorkspaces(supabase);
  return NextResponse.json({
    ...result,
    took_ms: Date.now() - started,
  });
}
