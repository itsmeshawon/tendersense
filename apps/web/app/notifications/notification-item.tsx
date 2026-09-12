"use client";

import Link from "next/link";
import { useTransition } from "react";
import { markReadAction } from "./actions";
import type { NotificationRow } from "@/lib/notifications/repository";

export function NotificationItem({
  n,
  formatDate,
}: {
  n: NotificationRow;
  formatDate: (iso: string) => string;
}) {
  const [pending, startTransition] = useTransition();
  const isRead = n.read_at !== null;
  const isDeadline =
    Array.isArray(n.metadata?.changed_fields) &&
    (n.metadata.changed_fields as string[]).includes("deadline_at");

  const markRead = () => startTransition(() => markReadAction(n.id));

  return (
    <li
      className={`flex flex-col gap-1 rounded-md border p-4 text-sm ${
        isRead ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-baseline justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span
              className={
                isDeadline
                  ? "shrink-0 rounded-full border border-red-600 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
                  : "shrink-0 rounded-full border px-2 py-0.5 text-xs text-muted-foreground"
              }
            >
              {n.title}
            </span>
            <p className="truncate text-sm">{n.body}</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDate(n.created_at)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs">
          {n.opportunity_id ? (
            <Link
              href="/opportunities"
              className="rounded-md border px-2 py-1 hover:bg-accent"
            >
              View
            </Link>
          ) : null}
          {!isRead ? (
            <button
              type="button"
              onClick={markRead}
              disabled={pending}
              className="rounded-md border px-2 py-1 hover:bg-accent disabled:opacity-50"
            >
              Mark read
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}
