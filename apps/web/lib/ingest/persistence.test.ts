import { describe, expect, it, vi } from "vitest";
import {
  beginSyncRun,
  endSyncRun,
  findOpportunityByExternalId,
  updateSourceCursor,
  upsertOpportunity,
  upsertSourceRecord,
  writeRevision,
  type ExistingOpportunity,
} from "./persistence";
import type { NormalizedOpportunity } from "./types";

/** Builds a chainable Supabase-JS query-builder mock. */
function buildChain(finalValue: unknown) {
  const single = vi.fn().mockResolvedValue(finalValue);
  const maybeSingle = vi.fn().mockResolvedValue(finalValue);
  const then = (r: (v: unknown) => void) => r(finalValue as never);
  const chain: Record<string, unknown> = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    eq: vi.fn(),
    single,
    maybeSingle,
    // Support await chain.something() by resolving to finalValue
    then,
  };
  // Every builder method returns the same chain object (except terminals)
  for (const key of ["select", "insert", "update", "upsert", "eq"]) {
    (chain[key] as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  }
  return chain as Record<string, ReturnType<typeof vi.fn>> & {
    then: (r: (v: unknown) => void) => void;
  };
}

function fakeClient(fromReturn: unknown) {
  const from = vi.fn().mockReturnValue(fromReturn);
  return { from } as unknown as Parameters<typeof upsertSourceRecord>[0];
}

const normalized: NormalizedOpportunity = {
  sourceKey: "world_bank",
  externalId: "WORLD_BANK:OP-1",
  sourceUrl: "https://example.com/1",
  title: "Sample tender",
  status: "open",
  contentHash: "hash-abc",
  publicationAt: "2026-09-01T00:00:00Z",
  deadlineAt: "2026-10-01T00:00:00Z",
};

describe("beginSyncRun", () => {
  it("inserts a run row with status=running and returns its id", async () => {
    const chain = buildChain({ data: { id: "run-1" }, error: null });
    const client = fakeClient(chain);
    const id = await beginSyncRun(client, "world_bank");
    expect(id).toBe("run-1");
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ source_key: "world_bank", status: "running" }),
    );
  });

  it("throws when supabase returns an error", async () => {
    const chain = buildChain({ data: null, error: { message: "boom" } });
    const client = fakeClient(chain);
    await expect(beginSyncRun(client, "world_bank")).rejects.toThrow(/boom/);
  });
});

describe("endSyncRun", () => {
  it("updates the run with counts and terminal status", async () => {
    const chain = buildChain({ data: null, error: null });
    const client = fakeClient(chain);
    await endSyncRun(client, "run-1", {
      status: "success",
      recordsFetched: 10,
      recordsCreated: 5,
      recordsUpdated: 3,
      recordsUnchanged: 2,
      recordsFailed: 0,
    });
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "success",
        records_fetched: 10,
        records_created: 5,
        records_updated: 3,
        records_unchanged: 2,
        records_failed: 0,
      }),
    );
    expect(chain.eq).toHaveBeenCalledWith("id", "run-1");
  });

  it("includes error_summary when provided", async () => {
    const chain = buildChain({ data: null, error: null });
    const client = fakeClient(chain);
    await endSyncRun(client, "run-1", {
      status: "failed",
      recordsFetched: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsUnchanged: 0,
      recordsFailed: 0,
      errorSummary: "adapter blew up",
    });
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
        error_summary: "adapter blew up",
      }),
    );
  });
});

describe("upsertSourceRecord", () => {
  it("upserts on (source_key, external_id) with payload and content_hash", async () => {
    const chain = buildChain({ data: null, error: null });
    const client = fakeClient(chain);
    await upsertSourceRecord(client, {
      sourceKey: "world_bank",
      externalId: "OP-1",
      sourceUrl: "https://example.com/1",
      payload: { any: "shape" },
      contentHash: "hash-abc",
    });
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        source_key: "world_bank",
        external_id: "OP-1",
        content_hash: "hash-abc",
      }),
      expect.objectContaining({
        onConflict: "source_key,external_id",
      }),
    );
  });
});

describe("findOpportunityByExternalId", () => {
  it("returns { id, content_hash } when found", async () => {
    const chain = buildChain({
      data: { id: "op-1", content_hash: "hash-abc" },
      error: null,
    });
    const client = fakeClient(chain);
    const res = await findOpportunityByExternalId(client, "world_bank", "OP-1");
    expect(res).toEqual<ExistingOpportunity>({
      id: "op-1",
      contentHash: "hash-abc",
    });
  });

  it("returns null when no row exists", async () => {
    const chain = buildChain({ data: null, error: null });
    const client = fakeClient(chain);
    await expect(
      findOpportunityByExternalId(client, "world_bank", "OP-missing"),
    ).resolves.toBeNull();
  });
});

describe("upsertOpportunity", () => {
  it("upserts on (source_key, external_id) and returns the row id", async () => {
    const chain = buildChain({ data: { id: "op-1" }, error: null });
    const client = fakeClient(chain);
    const id = await upsertOpportunity(client, normalized);
    expect(id).toBe("op-1");
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        source_key: "world_bank",
        external_id: "WORLD_BANK:OP-1",
        content_hash: "hash-abc",
      }),
      expect.objectContaining({
        onConflict: "source_key,external_id",
      }),
    );
  });
});

describe("writeRevision", () => {
  it("inserts a revision row with changed fields snapshot", async () => {
    const chain = buildChain({ data: null, error: null });
    const client = fakeClient(chain);
    await writeRevision(client, {
      opportunityId: "op-1",
      revisionNo: 2,
      previousHash: "old-hash",
      newHash: "new-hash",
      changedFields: ["deadline_at", "title"],
      changeSnapshot: { deadline_at: { from: "x", to: "y" } },
    });
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        opportunity_id: "op-1",
        revision_no: 2,
        previous_hash: "old-hash",
        new_hash: "new-hash",
        changed_fields: ["deadline_at", "title"],
      }),
    );
  });
});

describe("updateSourceCursor", () => {
  it("writes cursor + last_successful_sync_at on sources row", async () => {
    const chain = buildChain({ data: null, error: null });
    const client = fakeClient(chain);
    await updateSourceCursor(
      client,
      "world_bank",
      { skip: 300 },
      "2026-09-12T05:00:00Z",
    );
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        last_successful_sync_at: "2026-09-12T05:00:00Z",
      }),
    );
    expect(chain.eq).toHaveBeenCalledWith("key", "world_bank");
  });
});
