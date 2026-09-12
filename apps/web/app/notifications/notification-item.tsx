"use client";

import Link from "next/link";
import { useTransition } from "react";
import { markReadAction } from "./actions";
import type { NotificationRow } from "@/lib/notifications/repository";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    <li>
      <Card className={isRead ? "opacity-60" : ""}>
        <CardContent className="flex items-baseline justify-between gap-4 p-4 text-sm">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <Badge variant={isDeadline ? "destructive" : "outline"}>
                {n.title}
              </Badge>
              <p className="truncate text-sm">{n.body}</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDate(n.created_at)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-xs">
            {n.opportunity_id ? (
              <Link href="/opportunities">
                <Button variant="outline" size="xs">
                  View
                </Button>
              </Link>
            ) : null}
            {!isRead ? (
              <Button
                type="button"
                onClick={markRead}
                disabled={pending}
                variant="outline"
                size="xs"
              >
                Mark read
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </li>
  );
}
