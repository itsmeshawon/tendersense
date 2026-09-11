import { describe, expect, it } from "vitest";
import type { NormalizedOpportunity } from "./types";
import { computeContentHash, withComputedHash } from "./normalizer";

function makeOpportunity(
  overrides: Partial<Omit<NormalizedOpportunity, "contentHash">> = {},
): Omit<NormalizedOpportunity, "contentHash"> {
  return {
    sourceKey: "world_bank",
    externalId: "wb-42",
    sourceUrl: "https://example.com/42",
    title: "ERP for Ministry of X",
    description: "some description",
    procurementMethod: "ICB",
    procuringEntityName: "Ministry of X",
    deadlineAt: "2026-10-01T00:00:00Z",
    estimatedValueMin: 1_000_000,
    estimatedValueMax: 2_000_000,
    status: "open",
    ...overrides,
  };
}

describe("computeContentHash", () => {
  it("is deterministic — same input yields same hash", () => {
    const a = computeContentHash(makeOpportunity());
    const b = computeContentHash(makeOpportunity());
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("changes when title changes", () => {
    const a = computeContentHash(makeOpportunity());
    const b = computeContentHash(makeOpportunity({ title: "Updated title" }));
    expect(a).not.toBe(b);
  });

  it("changes when deadline changes", () => {
    const a = computeContentHash(makeOpportunity());
    const b = computeContentHash(
      makeOpportunity({ deadlineAt: "2026-11-01T00:00:00Z" }),
    );
    expect(a).not.toBe(b);
  });

  it("changes when procurement method changes", () => {
    const a = computeContentHash(makeOpportunity());
    const b = computeContentHash(makeOpportunity({ procurementMethod: "LCB" }));
    expect(a).not.toBe(b);
  });

  it("changes when estimated value range changes", () => {
    const a = computeContentHash(makeOpportunity());
    const b = computeContentHash(
      makeOpportunity({ estimatedValueMax: 3_000_000 }),
    );
    expect(a).not.toBe(b);
  });

  it("changes when source_url changes (document URL is a material field per SoT §26)", () => {
    const a = computeContentHash(makeOpportunity());
    const b = computeContentHash(
      makeOpportunity({ sourceUrl: "https://example.com/moved" }),
    );
    expect(a).not.toBe(b);
  });

  it("is NOT sensitive to non-material fields like reference_no or tags", () => {
    const a = computeContentHash(makeOpportunity());
    const b = computeContentHash(
      makeOpportunity({
        referenceNo: "different",
        tags: ["hot", "priority"],
        sector: ["ICT"],
      }),
    );
    expect(a).toBe(b);
  });

  it("treats undefined and missing consistently", () => {
    const a = computeContentHash(makeOpportunity({ description: undefined }));
    const b = computeContentHash(
      makeOpportunity({ description: undefined as unknown as string }),
    );
    expect(a).toBe(b);
  });
});

describe("withComputedHash", () => {
  it("returns a NormalizedOpportunity with contentHash populated", () => {
    const o = withComputedHash(makeOpportunity());
    expect(o.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(o.title).toBe("ERP for Ministry of X");
  });

  it("does not mutate the input", () => {
    const input = makeOpportunity();
    withComputedHash(input);
    expect("contentHash" in input).toBe(false);
  });
});
