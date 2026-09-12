import type { Eligibility } from "@/lib/matching/repository";

/**
 * The eligibility axis, rendered as a compact pill alongside GradeChip.
 * Two signals coexist per Phase 4 §2b: `A + PASS` vs `A + FAIL` are
 * distinct verdicts and must not collapse into one.
 */
export function EligibilityChip({
  value,
  title,
}: {
  value: Eligibility | null | undefined;
  title?: string;
}) {
  if (!value || value === "not_evaluated") return null;
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${TONE[value]}`}
      title={title ?? TOOLTIP[value]}
    >
      {LABEL[value]}
    </span>
  );
}

const LABEL: Record<Eligibility, string> = {
  pass: "Eligible",
  partial: "Partial",
  needs_verification: "Needs verify",
  fail: "Not eligible",
  not_evaluated: "",
};

const TOOLTIP: Record<Eligibility, string> = {
  pass: "All mandatory requirements met",
  partial: "Some mandatory requirements only partially met",
  needs_verification: "One or more mandatory requirements need verification",
  fail: "At least one mandatory requirement is a gap",
  not_evaluated: "",
};

const TONE: Record<Eligibility, string> = {
  pass: "border-green-600 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300",
  partial:
    "border-amber-600 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  needs_verification:
    "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
  fail: "border-red-600 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
  not_evaluated: "",
};
