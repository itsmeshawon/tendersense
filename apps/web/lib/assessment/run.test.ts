import { describe, expect, it, vi } from "vitest";
import { runAssessment } from "./run";

/**
 * A minimal supabase-shaped stub. Each table's chainable calls end in
 * a `then`-able promise, matching the postgrest-js surface the runner
 * uses. We record inserts by table for assertions.
 */
function fakeSupabase(opts: {
  opportunity: { description: string | null };
  workspace: { country_code: string | null };
  credentials?: unknown[];
  projects?: unknown[];
  financials?: unknown[];
  workforce?: unknown | null;
  insertedRequirementIds?: string[];
}) {
  const inserts: Record<string, unknown[]> = {};
  const updates: Record<string, unknown[]> = {};

  const insertReq = opts.insertedRequirementIds ?? [];

  function makeChain(table: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: Record<string, any> = {};
    chain.select = () => chain;
    chain.eq = () => chain;
    chain.order = () => chain;
    chain.maybeSingle = () => {
      if (table === "opportunities")
        return Promise.resolve({ data: opts.opportunity, error: null });
      if (table === "workspaces")
        return Promise.resolve({ data: opts.workspace, error: null });
      if (table === "workspace_workforce")
        return Promise.resolve({ data: opts.workforce ?? null, error: null });
      return Promise.resolve({ data: null, error: null });
    };
    chain.single = () => {
      if (table === "assessments") {
        return Promise.resolve({ data: { id: "assessment-1" }, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    };
    chain.then = (cb: (v: unknown) => unknown) => {
      let data: unknown = [];
      if (table === "workspace_credentials") data = opts.credentials ?? [];
      else if (table === "projects") data = opts.projects ?? [];
      else if (table === "workspace_financials") data = opts.financials ?? [];
      return Promise.resolve({ data, error: null }).then(cb);
    };
    return chain;
  }

  const from = vi.fn((table: string) => {
    const chain = makeChain(table);
    const insert = vi.fn((rows: unknown) => {
      inserts[table] = (inserts[table] ?? []).concat(
        Array.isArray(rows) ? rows : [rows],
      );
      if (table === "opportunity_requirements") {
        const arr = Array.isArray(rows) ? rows : [rows];
        const withIds = arr.map((r, i) => ({
          ...(r as object),
          id: insertReq[i] ?? `req-${i}`,
        }));
        return {
          select: () => Promise.resolve({ data: withIds, error: null }),
        };
      }
      return {
        select: () => ({ single: chain.single }),
      };
    });
    const update = vi.fn((row: unknown) => {
      updates[table] = (updates[table] ?? []).concat([row]);
      const eqChain: Record<string, unknown> = {};
      eqChain.eq = () => eqChain;
      eqChain.select = () => ({
        single: () => Promise.resolve({ data: null, error: null }),
      });
      eqChain.then = (cb: (v: unknown) => unknown) =>
        Promise.resolve({ data: null, error: null }).then(cb);
      return { eq: () => eqChain };
    });
    return { ...chain, insert, update };
  });

  return { supabase: { from } as never, inserts, updates };
}

describe("runAssessment", () => {
  it("returns not_evaluated when the opportunity has no description text", async () => {
    const { supabase } = fakeSupabase({
      opportunity: { description: null },
      workspace: { country_code: "BD" },
    });
    const r = await runAssessment(supabase, {
      workspaceId: "ws-1",
      opportunityId: "opp-1",
      requestedBy: "u-1",
    });
    expect(r.score.eligibility).toBe("not_evaluated");
    expect(r.requirementsCount).toBe(0);
  });

  it("runs the full pipeline against a real-ish description and writes rows", async () => {
    const { supabase, inserts, updates } = fakeSupabase({
      opportunity: {
        description:
          "The bidder must hold a valid ISO 27001 certification and be registered in Bangladesh.",
      },
      workspace: { country_code: "BD" },
      credentials: [
        {
          id: "c-1",
          credential_type: "iso",
          name: "ISO 27001",
          credential_number: "27001",
          status: "valid",
          expiry_date: null,
        },
      ],
      insertedRequirementIds: ["r-1", "r-2", "r-3"],
    });
    const r = await runAssessment(supabase, {
      workspaceId: "ws-1",
      opportunityId: "opp-1",
      requestedBy: "u-1",
    });

    expect(r.assessmentId).toBe("assessment-1");
    expect(r.requirementsCount).toBeGreaterThan(0);
    expect(inserts.assessments?.length).toBe(1);
    expect(inserts.opportunity_requirements?.length).toBe(
      r.requirementsCount,
    );
    expect(inserts.requirement_evaluations?.length).toBe(r.requirementsCount);
    expect(updates.assessments?.length).toBe(1);
  });
});
