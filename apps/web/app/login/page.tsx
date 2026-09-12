"use client";

import { useActionState, useState } from "react";
import {
  sendMagicLink,
  signInWithPassword,
  type SendMagicLinkState,
  type PasswordSignInState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const magicInitial: SendMagicLinkState = { status: "idle" };
const pwInitial: PasswordSignInState = { status: "idle" };

export default function LoginPage() {
  const [magicState, magicAction, magicPending] = useActionState(
    sendMagicLink,
    magicInitial,
  );
  const [pwState, pwAction, pwPending] = useActionState(
    signInWithPassword,
    pwInitial,
  );
  const [mode, setMode] = useState<"password" | "magic">("password");

  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <p className="text-sm text-muted-foreground">
            Use your email + password, or request a magic link.
          </p>
        </CardHeader>
        <CardContent>
          {magicState.status === "sent" ? (
            <div
              className="rounded-md border bg-accent/30 p-4 text-sm"
              data-testid="magic-link-sent"
            >
              <p className="font-medium">Check your inbox</p>
              <p className="mt-1 text-muted-foreground">
                We sent a link to{" "}
                <span className="font-mono">{magicState.email}</span>. It
                expires in an hour.
              </p>
            </div>
          ) : (
            <Tabs
              value={mode}
              onValueChange={(v) => setMode(v as "password" | "magic")}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="password">Password</TabsTrigger>
                <TabsTrigger value="magic">Magic link</TabsTrigger>
              </TabsList>

              <TabsContent value="password" className="mt-4">
                <form action={pwAction} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="pw-email">Email</Label>
                    <Input
                      id="pw-email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      autoFocus
                      placeholder="you@example.com"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="pw-secret">Password</Label>
                    <Input
                      id="pw-secret"
                      name="password"
                      type="password"
                      required
                      autoComplete="current-password"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={pwPending}
                    className="w-full"
                  >
                    {pwPending ? "Signing in…" : "Sign in"}
                  </Button>
                  {pwState.status === "error" ? (
                    <p role="alert" className="text-sm text-red-600">
                      {pwState.message}
                    </p>
                  ) : null}
                </form>
              </TabsContent>

              <TabsContent value="magic" className="mt-4">
                <form action={magicAction} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="magic-email">Email</Label>
                    <Input
                      id="magic-email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="you@example.com"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={magicPending}
                    className="w-full"
                  >
                    {magicPending ? "Sending…" : "Send magic link"}
                  </Button>
                  {magicState.status === "error" ? (
                    <p role="alert" className="text-sm text-red-600">
                      {magicState.message}
                    </p>
                  ) : null}
                </form>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
