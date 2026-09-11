"use client";

import { useActionState } from "react";
import { sendMagicLink, type SendMagicLinkState } from "./actions";

const initial: SendMagicLinkState = { status: "idle" };

export default function LoginPage() {
  const [state, action, pending] = useActionState(sendMagicLink, initial);

  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we will send you a magic link.
        </p>
      </div>

      {state.status === "sent" ? (
        <div
          className="rounded-md border p-4 text-sm"
          data-testid="magic-link-sent"
        >
          <p className="font-medium">Check your inbox</p>
          <p className="mt-1 text-muted-foreground">
            We sent a link to <span className="font-mono">{state.email}</span>.
            It expires in an hour.
          </p>
        </div>
      ) : (
        <form action={action} className="flex flex-col gap-3">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            autoFocus
            className="rounded-md border px-3 py-2 text-sm"
            placeholder="you@example.com"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {pending ? "Sending…" : "Send magic link"}
          </button>
          {state.status === "error" ? (
            <p role="alert" className="text-sm text-red-600">
              {state.message}
            </p>
          ) : null}
        </form>
      )}
    </main>
  );
}
