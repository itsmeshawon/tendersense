import type { MonitoringProfile } from "../monitoring/repository";

/**
 * Minimum opportunity shape needed for profile-matching. Matches a
 * subset of `public.opportunities` columns.
 */
export type MatchableOpportunity = {
  id: string;
  source_key: string;
  country_code: string | null;
  procurement_method: string | null;
  sector: string[] | null;
  title: string;
  description: string | null;
};

/**
 * Deterministic AND across filter dimensions (per ADR 0011 draft in
 * Phase 2 plan). An empty filter array = "any". Within a single
 * keyword array, matching is OR (any hit is enough) — noted in the
 * plan §3.
 *
 * Keyword matching is case-insensitive and word-boundary aware
 * (Phase 3 Q2 decision) to avoid "SME" matching "SMEs".
 */
export function profileMatchesOpportunity(
  profile: MonitoringProfile,
  opp: MatchableOpportunity,
): boolean {
  // Country
  if (
    profile.country_codes.length > 0 &&
    (!opp.country_code || !profile.country_codes.includes(opp.country_code))
  ) {
    return false;
  }
  // Source
  if (
    profile.source_keys.length > 0 &&
    !profile.source_keys.includes(opp.source_key)
  ) {
    return false;
  }
  // Procurement method
  if (
    profile.procurement_methods.length > 0 &&
    (!opp.procurement_method ||
      !profile.procurement_methods.includes(opp.procurement_method))
  ) {
    return false;
  }
  // Sectors — overlap semantics: opportunity has any of the profile's sectors
  if (profile.sectors.length > 0) {
    const oppSectors = opp.sector ?? [];
    const overlap = profile.sectors.some((s) => oppSectors.includes(s));
    if (!overlap) return false;
  }
  // Text — title + description searchable
  const haystack = `${opp.title} ${opp.description ?? ""}`;
  // Excluded keywords: any hit rejects the row
  for (const kw of profile.excluded_keywords) {
    if (matchesWord(haystack, kw)) return false;
  }
  // Required keywords: OR (any hit is enough)
  if (profile.keywords.length > 0) {
    const hit = profile.keywords.some((kw) => matchesWord(haystack, kw));
    if (!hit) return false;
  }
  return true;
}

function matchesWord(haystack: string, keyword: string): boolean {
  if (!keyword) return false;
  // \b word-boundary, case-insensitive
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\b${escaped}\\b`, "i");
  return re.test(haystack);
}
