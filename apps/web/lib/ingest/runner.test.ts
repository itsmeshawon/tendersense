import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  NormalizedOpportunity,
  ProcurementSourceAdapter,
  SourcePage,
} from "./types";

// Mock the persistence layer so the runner is tested in isolation.
const persistenceMocks = vi.hoisted(() => ({
  beginSyncRun: vi.fn(),
  endSyncRun: vi.fn(),
  upsertSourceRecord: vi.fn(),
  findOpportunityByExternalId: vi.fn(),
  upsertOpportunity: vi.fn(),
  writeRevision: vi.fn(),
  nextRevisionNo: vi.fn(),
  updateSourceCursor: vi.fn(),
}));

vi.mock("./persistence", () => persistenceMocks);

const fanoutMocks = vi.hoisted(() => ({
  fanoutRevisionNotifications: vi.fn(),
}));
vi.mock("../notifications/fanout", () => fanoutMocks);

import { runSync, type RunResult } from "./runner";

// ---- helpers ----

function normalized(
  id: string,
  hash: string,
  overrides: Partial<NormalizedOpportunity> = {},
): NormalizedOpportunity {
  return {
    sourceKey: "world_bank",
    externalId: `WORLD_BANK:${id}`,
    sourceUrl: `https://example.com/${id}`,
    title: `Tender ${id}`,
    status: "open",
    contentHash: hash,
    publicationAt: "2026-09-01T00:00:00Z",
    deadlineAt: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

function makeAdapter(pages: SourcePage[]): ProcurementSourceAdapter {
  let idx = 0;
  const normalizeMap = new Map<string, NormalizedOpportunity>();
  // Records in pages are already NormalizedOpportunity for simplicity;
  // in production they'd be raw records the adapter normalize()s.
  for (const page of pages) {
    for (const rec of page.records) {
      const n = rec as NormalizedOpportunity;
      normalizeMap.set(n.externalId, n);
    }
  }
  return {
    sourceKey: "world_bank",
    async fetchPage(): Promise<SourcePage> {
      const page = pages[idx];
      idx += 1;
      if (!page) return { records: [], isLastPage: true };
      return page;
    },
    async normalize(raw: unknown): Promise<NormalizedOpportunity> {
      return raw as NormalizedOpportunity;
    },
    async healthCheck() {
      return { ok: true, latencyMs: 0, checkedAt: new Date().toISOString() };
    },
  };
}

const fakeClient = {} as unknown as Parameters<typeof runSync>[1];

describe("runSync", () => {
  beforeEach(() => {
    for (const mock of Object.values(persistenceMocks)) mock.mockReset();
    persistenceMocks.beginSyncRun.mockResolvedValue("run-1");
    persistenceMocks.upsertSourceRecord.mockResolvedValue(undefined);
    persistenceMocks.findOpportunityByExternalId.mockResolvedValue(null);
    persistenceMocks.upsertOpportunity.mockResolvedValue("op-generated");
    persistenceMocks.writeRevision.mockResolvedValue("rev-1");
    persistenceMocks.nextRevisionNo.mockResolvedValue(1);
    persistenceMocks.endSyncRun.mockResolvedValue(undefined);
    persistenceMocks.updateSourceCursor.mockResolvedValue(undefined);
    fanoutMocks.fanoutRevisionNotifications.mockReset();
    fanoutMocks.fanoutRevisionNotifications.mockResolvedValue({
      workspacesNotified: 0,
    });
  });

  it("marks run success and advances cursor on empty first page", async () => {
    const adapter = makeAdapter([{ records: [], isLastPage: true }]);
    const result = await runSync(adapter, fakeClient);
    expect(result).toMatchObject<Partial<RunResult>>({
      status: "success",
      recordsFetched: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsUnchanged: 0,
      recordsFailed: 0,
      runId: "run-1",
    });
    expect(persistenceMocks.beginSyncRun).toHaveBeenCalledWith(
      fakeClient,
      "world_bank",
    );
    expect(persistenceMocks.endSyncRun).toHaveBeenCalledWith(
      fakeClient,
      "run-1",
      expect.objectContaining({ status: "success" }),
    );
    expect(persistenceMocks.updateSourceCursor).toHaveBeenCalled();
  });

  it("counts a new record as created and does NOT write a revision", async () => {
    const rec = normalized("A", "hash-A");
    const adapter = makeAdapter([
      { records: [rec], isLastPage: true },
    ]);
    // No existing row → runner treats as created
    persistenceMocks.findOpportunityByExternalId.mockResolvedValue(null);
    persistenceMocks.upsertOpportunity.mockResolvedValue("op-A");

    const result = await runSync(adapter, fakeClient);

    expect(result.recordsCreated).toBe(1);
    expect(result.recordsUpdated).toBe(0);
    expect(result.recordsUnchanged).toBe(0);
    expect(persistenceMocks.writeRevision).not.toHaveBeenCalled();
    expect(persistenceMocks.upsertSourceRecord).toHaveBeenCalledTimes(1);
    expect(persistenceMocks.upsertOpportunity).toHaveBeenCalledTimes(1);
  });

  it("counts an unchanged record as unchanged and skips the revision write", async () => {
    const rec = normalized("A", "hash-A");
    const adapter = makeAdapter([{ records: [rec], isLastPage: true }]);
    // Existing row has the same content_hash
    persistenceMocks.findOpportunityByExternalId.mockResolvedValue({
      id: "op-A",
      contentHash: "hash-A",
      deadlineAt: null,
      title: "Tender A",
      status: "open",
    });

    const result = await runSync(adapter, fakeClient);

    expect(result.recordsUnchanged).toBe(1);
    expect(result.recordsCreated).toBe(0);
    expect(result.recordsUpdated).toBe(0);
    expect(persistenceMocks.writeRevision).not.toHaveBeenCalled();
    // upsertOpportunity still called so last_seen_at is refreshed
    expect(persistenceMocks.upsertOpportunity).toHaveBeenCalledTimes(1);
  });

  it("counts a changed record as updated and writes a revision", async () => {
    const rec = normalized("A", "hash-new", {
      title: "New title",
      deadlineAt: "2026-10-15T00:00:00Z",
    });
    const adapter = makeAdapter([{ records: [rec], isLastPage: true }]);
    persistenceMocks.findOpportunityByExternalId.mockResolvedValue({
      id: "op-A",
      contentHash: "hash-old",
      deadlineAt: "2026-10-01T00:00:00Z",
      title: "Old title",
      status: "open",
    });
    persistenceMocks.upsertOpportunity.mockResolvedValue("op-A");

    const result = await runSync(adapter, fakeClient);

    expect(result.recordsUpdated).toBe(1);
    expect(persistenceMocks.writeRevision).toHaveBeenCalledTimes(1);
    const revisionCall = persistenceMocks.writeRevision.mock.calls[0][1];
    expect(revisionCall).toMatchObject({
      opportunityId: "op-A",
      previousHash: "hash-old",
      newHash: "hash-new",
    });
  });

  it("iterates multiple pages until isLastPage=true", async () => {
    const adapter = makeAdapter([
      {
        records: [normalized("A", "h-A"), normalized("B", "h-B")],
        isLastPage: false,
        nextCursor: { skip: 2 },
      },
      { records: [normalized("C", "h-C")], isLastPage: true },
    ]);

    const result = await runSync(adapter, fakeClient);

    expect(result.recordsFetched).toBe(3);
    expect(result.recordsCreated).toBe(3);
    expect(result.status).toBe("success");
  });

  it("respects maxPages safety cap even when isLastPage is false", async () => {
    // Build 10 pages of 1 record each; cap should stop after maxPages=3
    const pages: SourcePage[] = Array.from({ length: 10 }, (_, i) => ({
      records: [normalized(`R${i}`, `h-${i}`)],
      isLastPage: false,
      nextCursor: { skip: i + 1 },
    }));
    const adapter = makeAdapter(pages);

    const result = await runSync(adapter, fakeClient, { maxPages: 3 });
    expect(result.recordsFetched).toBe(3);
    // status is partial because the cap kicked in
    expect(result.status).toBe("partial");
  });

  it("marks the run failed and does NOT advance cursor on adapter error", async () => {
    const failing: ProcurementSourceAdapter = {
      sourceKey: "world_bank",
      async fetchPage() {
        throw new Error("network kaput");
      },
      async normalize(r: unknown) {
        return r as NormalizedOpportunity;
      },
      async healthCheck() {
        return { ok: false, latencyMs: 0, checkedAt: "" };
      },
    };
    const result = await runSync(failing, fakeClient);
    expect(result.status).toBe("failed");
    expect(result.errorSummary).toMatch(/network kaput/);
    expect(persistenceMocks.endSyncRun).toHaveBeenCalledWith(
      fakeClient,
      "run-1",
      expect.objectContaining({ status: "failed" }),
    );
    expect(persistenceMocks.updateSourceCursor).not.toHaveBeenCalled();
  });

  it("counts an individual record failure but continues the run", async () => {
    const adapter = makeAdapter([
      {
        records: [normalized("A", "h-A"), normalized("B", "h-B")],
        isLastPage: true,
      },
    ]);
    // B's persistence write fails
    persistenceMocks.upsertOpportunity.mockImplementation(
      async (_c: unknown, n: NormalizedOpportunity) => {
        if (n.externalId.endsWith("B")) throw new Error("db conflict");
        return "op-A";
      },
    );

    const result = await runSync(adapter, fakeClient);
    expect(result.recordsCreated).toBe(1);
    expect(result.recordsFailed).toBe(1);
    // Partial success: some failed, run finished
    expect(result.status).toBe("partial");
    expect(persistenceMocks.updateSourceCursor).toHaveBeenCalled();
  });

  it("uses the source's own key as adapter.sourceKey (not a wired string)", async () => {
    // Sanity: adapter identifies its source; runner passes that through.
    const adapter = makeAdapter([{ records: [], isLastPage: true }]);
    await runSync(adapter, fakeClient);
    expect(persistenceMocks.beginSyncRun).toHaveBeenCalledWith(
      fakeClient,
      adapter.sourceKey,
    );
  });
});
