import { AppShell } from "@/components/AppShell";

export default async function OpportunitiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
