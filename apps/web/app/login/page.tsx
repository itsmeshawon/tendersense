"use client";

import { useActionState, useState } from "react";
import {
  sendMagicLink,
  signInWithPassword,
  type SendMagicLinkState,
  type PasswordSignInState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <main className="grid min-h-svh grid-cols-1 lg:grid-cols-2">
      {/* Right panel on desktop; hidden on mobile — the form has to
          come first when space is tight. Left on md+ for LTR reading. */}
      <section className="hidden flex-col justify-between border-r border-border/60 bg-muted/40 p-10 lg:flex">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            T
          </span>
          <span className="font-[family-name:var(--font-heading)] text-base font-semibold tracking-tight">
            TenderSense
          </span>
        </div>
        <div className="flex flex-col gap-4 pr-8">
          <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold leading-tight tracking-tight text-foreground">
            Every public tender that matters. Graded before you open it.
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">
            TenderSense ingests procurement notices from World Bank, Bangladesh
            e-GP, and BPPA — then grades each one against your organisation's
            profile and surfaces the shortlist worth bidding on.
          </p>
          <ul className="mt-2 flex flex-col gap-2 text-sm text-muted-foreground">
            <li className="flex items-baseline gap-3">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              A/B/C/D fit grade, per your monitoring profile
            </li>
            <li className="flex items-baseline gap-3">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              Rule-based assessment against your credentials, financials, and past projects
            </li>
            <li className="flex items-baseline gap-3">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              Amendment tracking with deadline-change alerts
            </li>
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">
          Pilot with BRAC IT Services · 2026
        </p>
      </section>

      <section className="flex flex-col justify-center px-6 py-10 lg:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-6 lg:hidden">
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="grid h-6 w-6 place-items-center rounded-md bg-primary text-primary-foreground"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                T
              </span>
              <span className="font-[family-name:var(--font-heading)] text-base font-semibold tracking-tight">
                TenderSense
              </span>
            </div>
          </div>
          <div className="mb-6">
            <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight">
              Sign in
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use your email + password, or request a magic link.
            </p>
          </div>
          <Card>
            <CardContent className="pt-6">
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
        </div>
      </section>
    </main>
  );
}
