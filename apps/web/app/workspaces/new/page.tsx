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
          Pick individual for your own tender discovery, or organization for a
          team.
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

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Type</legend>
          <label className="flex items-start gap-3 rounded-md border p-3 text-sm">
            <input
              type="radio"
              name="type"
              value="individual"
              required
              defaultChecked
              className="mt-1"
            />
            <span>
              <span className="block font-medium">Individual</span>
              <span className="block text-muted-foreground">
                Solo consultants, freelancers, or independent experts.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-md border p-3 text-sm">
            <input
              type="radio"
              name="type"
              value="organization"
              className="mt-1"
            />
            <span>
              <span className="block font-medium">Organization</span>
              <span className="block text-muted-foreground">
                Companies, NGOs, agencies. You can invite up to 5 members on
                Pro.
              </span>
            </span>
          </label>
        </fieldset>

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
