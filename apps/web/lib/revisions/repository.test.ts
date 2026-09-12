import { describe, expect, it, vi } from "vitest";
import {
  getRevisionSummaryForOpportunities,
  listRecentRevisions,
  type RevisionRow,
} from "./repository";

const now = new Date().toISOString();

const rev = (oppId: string, changed: string[]): RevisionRow => ({
  id: `r-${oppId}`,
  opportunity_id: oppId,
  revision_no: 2,
  changed_fields: changed,
  detected_at: now,
});

function fakeSelectChain(finalValue: unknown) {
  const limitMock = vi.fn().mockResolvedValue(finalValue);
  const orderMock = vi.fn(() => ({
    limit: limitMock,
    then: (r: (v: unknown) => void) => Promise.resolve(finalValue).then(r),
  }));
  const inMock = vi.fn(() => ({ order: orderMock }));
  const gteMock = vi.fn(() => ({ order: orderMock }));
  const selectMock = vi.fn(() => ({ in: inMock, gte: gteMock }));
  return {
    from: vi.fn(() => ({ select: selectMock })),
    _spies: { selectMock, inMock, gteMock, orderMock, limitMock },
  };
}

describe("getRevisionSummaryForOpportunities", () => {
  it("returns empty map for empty input", async () => {
    const client = fakeSelectChain({ data: [], error: null });
    const map = await getRevisionSummaryForOpportunities(
      client as unknown as Parameters<
        typeof getRevisionSummaryForOpportunities
      >[0],
      [],
    );
    expect(map.size).toBe(0);
    // No supabase call should be made when list is empty
    expect(client._spies.inMock).not.toHaveBeenCalled();
  });

  it("counts revisions per opportunity + flags deadline change", async () => {
    const client = fakeSelectChain({
      data: [
        rev("op-A", ["deadline_at"]),
        rev("op-A", ["title"]),
        rev("op-B", ["description"]),
      ],
      error: null,
    });
    const map = await getRevisionSummaryForOpportunities(
      client as unknown as Parameters<
        typeof getRevisionSummaryForOpportunities
      >[0],
      ["op-A", "op-B", "op-C"],
    );
    expect(map.get("op-A")).toEqual({ count: 2, hasDeadlineChange: true });
    expect(map.get("op-B")).toEqual({ count: 1, hasDeadlineChange: false });
    expect(map.has("op-C")).toBe(false);
    expect(client._spies.inMock).toHaveBeenCalledWith(
      "opportunity_id",
      ["op-A", "op-B", "op-C"],
    );
  });
});

describe("listRecentRevisions", () => {
  it("queries revisions since cutoff, ordered by detected_at desc", async () => {
    const client = fakeSelectChain({ data: [], error: null });
    await listRecentRevisions(
      client as unknown as Parameters<typeof listRecentRevisions>[0],
      7,
    );
    expect(client._spies.gteMock).toHaveBeenCalledWith(
      "detected_at",
      expect.stringMatching(/T.*Z$/),
    );
    expect(client._spies.orderMock).toHaveBeenCalledWith("detected_at", {
      ascending: false,
    });
  });
});
