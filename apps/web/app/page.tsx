import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  RadioTower,
  Sparkles,
} from "lucide-react";
import { getServerUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";

/**
 * Public landing. Product-first — explains what TenderSense is,
 * routes to signup/login. Authenticated users see a "Continue"
 * shortcut instead of the auth pair.
 */
export default async function Landing() {
  const user = await getServerUser();
  const isAuthed = Boolean(user);

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      {/* Top bar — kept lean; landing header is not the app shell. */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-6 px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold tracking-tight"
          >
            <span
              aria-hidden
              className="grid h-6 w-6 place-items-center rounded-md bg-primary text-primary-foreground"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              T
            </span>
            <span className="font-[family-name:var(--font-heading)] text-base">
              TenderSense
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            {isAuthed ? (
              <Link href="/dashboard">
                <Button size="sm">
                  Continue to dashboard
                  <ArrowRight className="ml-1 size-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Log in
                  </Button>
                </Link>
                <Link href="/login?mode=signup">
                  <Button size="sm">
                    Get started
                    <ArrowRight className="ml-1 size-4" />
                  </Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-border/60">
        {/* Soft brand-tinted wash — teal at low opacity, top-left. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(1200px 500px at 15% -10%, oklch(0.58 0.13 200 / 12%), transparent 60%)",
          }}
        />
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-24 sm:py-32">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" aria-hidden />
            Piloting with BRAC IT Services · 2026
          </span>
          <h1 className="max-w-3xl font-[family-name:var(--font-heading)] text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Every public tender that matters.{" "}
            <span className="text-primary">Graded before you open it.</span>
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
            TenderSense ingests procurement notices from World Bank,
            Bangladesh e-GP, and BPPA — then grades each one against
            your organisation&rsquo;s profile and surfaces the shortlist
            actually worth bidding on.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {isAuthed ? (
              <Link href="/dashboard">
                <Button size="lg">
                  Continue to dashboard
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login?mode=signup">
                  <Button size="lg">
                    Get started
                    <ArrowRight className="ml-2 size-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline">
                    Log in
                  </Button>
                </Link>
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Pilot access is invite-only.
          </p>
        </div>
      </section>

      {/* Value props */}
      <section className="border-b border-border/60">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-20 md:grid-cols-3">
          <ValueCard
            icon={<RadioTower className="size-5" aria-hidden />}
            title="Monitor the sources that matter"
            body="Continuous sync from World Bank, Bangladesh e-GP, and BPPA. Amendments and deadline changes flagged the moment they happen."
          />
          <ValueCard
            icon={<Sparkles className="size-5" aria-hidden />}
            title="Grades before you read"
            body="A / B / C / D fit grades against your capabilities, sectors, keywords, past projects, country coverage, and credentials. Every score explains itself."
          />
          <ValueCard
            icon={<ClipboardCheck className="size-5" aria-hidden />}
            title="Assess before you commit"
            body="One click runs a rule-based eligibility assessment against your credentials, financials, and past projects. Bid / Verify / Hold / Skip with reasoning."
          />
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight sm:text-3xl">
            How it works
          </h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3">
            <Step
              n="1"
              title="Set up your profile"
              body="Capabilities, sectors, countries, credentials, past projects. Once — then it drives every grade automatically."
            />
            <Step
              n="2"
              title="Read the shortlist"
              body="Daily A- and B-grade fits from the sources you monitor. Filter by deadline, country, source. Save searches you run often."
            />
            <Step
              n="3"
              title="Run an assessment"
              body="On any shortlisted tender, one click extracts requirements and evaluates each against your profile. Pass / Partial / Verify / Gap per requirement."
            />
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-20 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="max-w-2xl font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight sm:text-3xl">
              Ready to see your first shortlist?
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Pilot workspaces onboard in about ten minutes.
            </p>
          </div>
          {isAuthed ? (
            <Link href="/dashboard">
              <Button size="lg">
                Continue to dashboard
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          ) : (
            <Link href="/login?mode=signup">
              <Button size="lg">
                Get started
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          )}
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-8 text-xs text-muted-foreground">
        <p>© 2026 TenderSense · Pilot with BRAC IT Services.</p>
        <p>Public procurement information. The official source remains authoritative.</p>
      </footer>
    </div>
  );
}

function ValueCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div>
      <span className="mb-4 inline-grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
        {icon}
      </span>
      <h3 className="font-[family-name:var(--font-heading)] text-lg font-semibold tracking-tight">
        {title}
      </h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="flex items-start gap-4">
      <span
        aria-hidden
        className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border border-primary/30 bg-primary/5 font-[family-name:var(--font-heading)] text-sm font-semibold text-primary"
      >
        {n}
      </span>
      <div>
        <h3 className="font-[family-name:var(--font-heading)] text-base font-semibold tracking-tight">
          {title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
    </li>
  );
}
