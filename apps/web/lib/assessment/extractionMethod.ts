/**
 * Adding a manual requirement to a rules-extracted assessment promotes
 * it to `mixed`. Manual-only or already-mixed stays as-is.
 */
export function nextExtractionMethodForManualAdd(
  current: "rules" | "manual" | "mixed",
): "rules" | "manual" | "mixed" {
  if (current === "rules") return "mixed";
  return current;
}
