"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { runAssessmentAction } from "@/lib/assessment/actions";

export function RunAssessmentButton({
  workspaceId,
  opportunityId,
  disabled,
  label = "Run Assessment",
}: {
  workspaceId: string;
  opportunityId: string;
  disabled?: boolean;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        disabled={disabled || pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              await runAssessmentAction(workspaceId, opportunityId);
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            }
          })
        }
      >
        {pending ? "Running…" : label}
      </Button>
      {error ? (
        <p className="max-w-xs text-right text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
