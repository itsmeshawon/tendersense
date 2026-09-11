"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  createWorkspaceAction,
  type CreateWorkspaceFormState,
} from "./actions";

const initial: CreateWorkspaceFormState = { status: "idle" };

export default function NewWorkspacePage() {
  const [state, action, pending] = useActionState(
    createWorkspaceAction,
    initial,
  );

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create a workspace
        </h1>
        <p className="text-sm text-muted-foreground">
          A workspace is where opportunities, capabilities, and decisions live.
          For pilot, workspaces represent an organization — a company, NGO, or
          agency pursuing tenders.
        </p>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={80}
            autoFocus
            className="rounded-md border px-3 py-2 text-sm"
            placeholder="Acme Consulting"
          />
        </div>

        {/*
          Individual workspaces hidden for MVP (ADR 0006 §7). The
          workspace_type enum in the DB still supports "individual" so
          re-enabling later is a UI change, not a migration. All MVP
          workspaces are organizations by default.
        */}
        <input type="hidden" name="type" value="organization" />

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create workspace"}
        </button>

        {state.status === "error" ? (
          <p role="alert" className="text-sm text-red-600">
            {state.message}
          </p>
        ) : null}

        <Link
          href="/workspaces"
          className="text-center text-sm text-muted-foreground underline"
        >
          Back to workspaces
        </Link>
      </form>
    </main>
  );
}
