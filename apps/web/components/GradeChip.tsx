"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { OpportunityMatchRow } from "@/lib/matching/repository";

/**
 * The grade chip + "Why this grade?" popover.
 * ADR 0006 §5: A/B/C/D + Not eligible + Need more info. Words matter —
 * never render "D" without "Weak fit" alongside; never render Not-
 * eligible as if it were a D.
 *
 * Popover is portalled to <body> to escape parent overflow: hidden
 * clipping (row cards, list containers) — Session 26 UX audit.
 */
export function GradeChip({ match }: { match: OpportunityMatchRow | null }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const popW = 288; // matches w-72
    function reposition() {
      if (!btnRef.current) return;
      const rect = btnRef.current.getBoundingClientRect();
      const left = Math.min(
        Math.max(8, rect.right - popW),
        window.innerWidth - popW - 8,
      );
      setCoords({ top: rect.bottom + 6, left });
    }
    reposition();
    // Keep the popover anchored to the trigger as the user scrolls
    // or resizes. `capture: true` so nested scroll containers fire.
    window.addEventListener("scroll", reposition, { passive: true, capture: true });
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, { capture: true });
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      if (popRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  if (!match) {
    return (
      <span
        className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground"
        title="Set up a monitoring profile and we'll grade this opportunity."
      >
        Not yet ranked
      </span>
    );
  }

  const { grade, score, reasons, concerns } = match;
  const cls = classFor(grade);
  const label = labelFor(grade);
  const hasDetail = reasons.length > 0 || concerns.length > 0;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}
        aria-expanded={open}
        title={hasDetail ? "Click for reasons" : label}
      >
        {label}
      </button>
      {open && hasDetail && coords && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popRef}
              className="fixed z-50 w-72 rounded-md border bg-background p-3 text-xs shadow-lg"
              style={{ top: coords.top, left: coords.left }}
              role="dialog"
            >
              <p className="mb-2 text-sm font-medium">
                Why {label}
                {grade === "A" || grade === "B" || grade === "C" || grade === "D"
                  ? ` (${score}/100)`
                  : ""}
              </p>
              {reasons.length > 0 ? (
                <div className="mb-2">
                  <p className="mb-1 font-semibold text-foreground">
                    Fit signals
                  </p>
                  <ul className="space-y-1 text-muted-foreground">
                    {reasons.map((r, i) => (
                      <li key={i}>
                        <span className="font-mono text-[10px]">
                          +{r.contribution}
                        </span>{" "}
                        {r.evidence}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {concerns.length > 0 ? (
                <div>
                  <p className="mb-1 font-semibold text-foreground">Concerns</p>
                  <ul className="space-y-1 text-muted-foreground">
                    {concerns.map((c, i) => (
                      <li key={i}>{c.evidence}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-2 text-muted-foreground underline hover:text-foreground"
              >
                Close
              </button>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function labelFor(grade: OpportunityMatchRow["grade"]): string {
  switch (grade) {
    case "A":
      return "A — Strong fit";
    case "B":
      return "B — Good fit";
    case "C":
      return "C — Possible";
    case "D":
      return "D — Weak fit";
    case "not_eligible":
      return "Not eligible";
    case "need_more_info":
      return "Need more info";
  }
}

function classFor(grade: OpportunityMatchRow["grade"]): string {
  switch (grade) {
    case "A":
      return "border-green-600 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300";
    case "B":
      return "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300";
    case "C":
      return "border-yellow-600 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200";
    case "D":
      return "border text-muted-foreground";
    case "not_eligible":
      // Deliberately distinct from D — grayed out with a strike-through
      // affordance (§Q6 escape hatch discipline).
      return "border-dashed border-muted-foreground text-muted-foreground line-through";
    case "need_more_info":
      return "border-dashed border-muted-foreground text-muted-foreground";
  }
}
