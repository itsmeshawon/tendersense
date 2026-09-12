"use client";

import { useTransition } from "react";
import {
  removeCredentialAction,
  setCredentialStatusAction,
} from "./actions";
import {
  CREDENTIAL_TYPE_LABEL,
  type CredentialRow as Row,
} from "@/lib/credentials/repository";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function CredentialRow({
  row,
  workspaceId,
  issuedLabel,
  expiresLabel,
}: {
  row: Row;
  workspaceId: string;
  issuedLabel: string;
  expiresLabel: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between gap-4 rounded-md border p-3 text-sm">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="truncate font-medium">{row.name}</p>
          <Badge variant="secondary">
            {CREDENTIAL_TYPE_LABEL[row.credential_type]}
          </Badge>
          {row.status !== "valid" ? (
            <Badge variant="outline">{row.status}</Badge>
          ) : null}
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {row.issuer ?? "—"} · issued {issuedLabel} · expires {expiresLabel}
          {row.credential_number ? (
            <>
              {" · "}
              <span className="font-mono">{row.credential_number}</span>
            </>
          ) : null}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-xs">
        {row.status === "valid" ? (
          <Button
            variant="outline"
            size="xs"
            disabled={pending}
            onClick={() =>
              startTransition(() =>
                setCredentialStatusAction(workspaceId, row.id, "expired"),
              )
            }
          >
            Mark expired
          </Button>
        ) : (
          <Button
            variant="outline"
            size="xs"
            disabled={pending}
            onClick={() =>
              startTransition(() =>
                setCredentialStatusAction(workspaceId, row.id, "valid"),
              )
            }
          >
            Mark valid
          </Button>
        )}
        <Button
          variant="outline"
          size="xs"
          className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
          disabled={pending}
          onClick={() => {
            if (!confirm(`Remove "${row.name}"?`)) return;
            startTransition(() => removeCredentialAction(workspaceId, row.id));
          }}
        >
          Remove
        </Button>
      </div>
    </li>
  );
}
