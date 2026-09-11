import { describe, expect, it } from "vitest";
import type {
  NormalizedOpportunity,
  ProcurementSourceAdapter,
  SourceHealth,
  SourcePage,
  SourceRecord,
} from "./types";

describe("ingest types", () => {
  it("compiles a valid NormalizedOpportunity", () => {
    const o: NormalizedOpportunity = {
      sourceKey: "world_bank",
      externalId: "wb-42",
      sourceUrl: "https://example.com/42",
      title: "Sample",
      status: "open",
      contentHash: "abc",
    };
    expect(o.sourceKey).toBe("world_bank");
  });

  it("compiles a minimal adapter", () => {
    const adapter: ProcurementSourceAdapter = {
      sourceKey: "world_bank",
      async fetchPage(): Promise<SourcePage> {
        return { records: [], isLastPage: true };
      },
      async normalize(): Promise<NormalizedOpportunity> {
        return {
          sourceKey: "world_bank",
          externalId: "x",
          sourceUrl: "https://example.com",
          title: "t",
          status: "unknown",
          contentHash: "h",
        };
      },
      async healthCheck(): Promise<SourceHealth> {
        return { ok: true, latencyMs: 0, checkedAt: new Date().toISOString() };
      },
    };
    expect(adapter.sourceKey).toBe("world_bank");
  });

  it("SourceRecord shape stays in sync with source_records table", () => {
    const rec: SourceRecord = {
      sourceKey: "bd_egp",
      externalId: "TN-123",
      sourceUrl: "https://eprocure.gov.bd/…",
      payload: { some: "raw thing" },
      contentHash: "h",
      fetchedAt: new Date().toISOString(),
    };
    expect(rec.externalId).toBe("TN-123");
  });
});
