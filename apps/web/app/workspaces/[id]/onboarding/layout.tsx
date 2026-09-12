/**
 * Route-segment config for `/workspaces/[id]/onboarding`.
 *
 * The eExperience search fires a live e-GP round-trip (session GET +
 * search POST + HTML parse) which runs 3-8s in practice. Vercel Functions
 * default to a 10-second ceiling — bump this segment to 30s so the
 * server action completes.
 *
 * `maxDuration` is a route-segment config export; it cannot live on the
 * "use server" actions file (Next.js requires those to export only async
 * functions). A layout is the closest server-side segment we can attach
 * it to, since `page.tsx` is a client component.
 */

export const maxDuration = 30;

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
