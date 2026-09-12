"use client";

import { useActionState } from "react";
import { sendMagicLink, type SendMagicLinkState } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: SendMagicLinkState = { status: "idle" };

export default function LoginPage() {
  const [state, action, pending] = useActionState(sendMagicLink, initial);

  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter your email and we will send you a magic link.
          </p>
        </CardHeader>
        <CardContent>
          {state.status === "sent" ? (
            <div
              className="rounded-md border bg-accent/30 p-4 text-sm"
              data-testid="magic-link-sent"
            >
              <p className="font-medium">Check your inbox</p>
              <p className="mt-1 text-muted-foreground">
                We sent a link to{" "}
                <span className="font-mono">{state.email}</span>. It expires in
                an hour.
              </p>
            </div>
          ) : (
            <form action={action} className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  autoFocus
                  placeholder="you@example.com"
                />
              </div>
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? "Sending…" : "Send magic link"}
              </Button>
              {state.status === "error" ? (
                <p role="alert" className="text-sm text-red-600">
                  {state.message}
                </p>
              ) : null}
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
