import { AppShell } from "@/components/AppShell";

export default async function WorkspacesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
