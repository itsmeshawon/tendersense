/**
 * PII helpers for procuring-entity officials.
 *
 * Locked stance (ADR 0006 §8):
 *   - source_records.payload keeps everything raw for re-parse
 *   - opportunities has NO structured PII columns
 *   - list views never show officials
 *   - detail views may show, to authenticated members
 *
 * These helpers are for the *serialization* layer — anywhere the payload
 * leaves the DB (logging, metrics, error reports, non-authenticated
 * responses). The DB row itself is untouched.
 */

const PII_KEY_PATTERNS: readonly RegExp[] = [
  /^(official|officer|contact)_?(name|full_?name)$/i,
  /^(official|officer|contact)_?(phone|mobile|cell|tel)$/i,
  /^(official|officer|contact)_?email$/i,
  /^focal_?person/i,
];

const PII_VALUE_PATTERNS: readonly RegExp[] = [
  // Bangladeshi mobile numbers: starts with +880 or 01, then digits/spaces/dashes.
  /(\+?880|01)[0-9\s\-]{8,}/,
  // Emails (light regex — enough for redaction, not RFC 5322 compliance).
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
];

/**
 * True if the key name matches a known official-contact pattern, OR
 * the value looks like a phone number / email.
 *
 * Used by adapter regression tests to catch new fields that shouldn't
 * become structured columns.
 */
export function looksLikePII(key: string, value: string): boolean {
  if (PII_KEY_PATTERNS.some((re) => re.test(key))) return true;
  return PII_VALUE_PATTERNS.some((re) => re.test(value));
}

const REDACTED = "[REDACTED]";

/**
 * Returns a deep copy of the payload with any PII-flagged string
 * replaced by "[REDACTED]". Non-objects pass through unchanged.
 */
export function redactOfficialContact<T>(payload: T): T {
  return redact(payload) as T;
}

function redact(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => redact(v));
  if (typeof value !== "object") return value;

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "string" && looksLikePII(k, v)) {
      out[k] = REDACTED;
    } else if (v && typeof v === "object") {
      out[k] = redact(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}
