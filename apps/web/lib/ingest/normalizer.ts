import { createHash } from "node:crypto";
import type { NormalizedOpportunity } from "./types";

/**
 * Fields that participate in `content_hash`. These are the fields SoT
 * §26 flags as material changes — a change here should generate an
 * `opportunity_revisions` row.
 *
 * Fields deliberately NOT hashed: reference_no, tags, sector, first_seen_at,
 * last_seen_at. Cosmetic or index-derived; changes here don't count as
 * amendments.
 */
const HASHED_FIELDS = [
  "sourceKey",
  "externalId",
  "title",
  "description",
  "deadlineAt",
  "procurementMethod",
  "procuringEntityName",
  "sourceUrl",
  "estimatedValueMin",
  "estimatedValueMax",
] as const satisfies readonly (keyof NormalizedOpportunity)[];

/**
 * Deterministic SHA-256 of the material fields of an opportunity.
 *
 * Serialization is a simple `key=value\n` join over a fixed field list,
 * so hash values are stable across TypeScript/JSON key-order variation.
 */
export function computeContentHash(
  o: Omit<NormalizedOpportunity, "contentHash">,
): string {
  const canonical = HASHED_FIELDS
    .map((f) => {
      const v = (o as Partial<NormalizedOpportunity>)[f];
      return `${String(f)}=${v === undefined || v === null ? "" : String(v)}`;
    })
    .join("\n");

  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

/**
 * Convenience: attach the computed hash without mutating the input.
 */
export function withComputedHash(
  o: Omit<NormalizedOpportunity, "contentHash">,
): NormalizedOpportunity {
  return { ...o, contentHash: computeContentHash(o) };
}
