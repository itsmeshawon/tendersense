import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  listCredentials,
  CREDENTIAL_TYPE_LABEL,
  type CredentialType,
} from "@/lib/credentials/repository";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddCredentialForm } from "./add-form";
import { CredentialRow } from "./row";

const TYPES: CredentialType[] = Object.keys(
  CREDENTIAL_TYPE_LABEL,
) as CredentialType[];

const DHAKA_DATE = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Dhaka",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function CredentialsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const { id: workspaceId } = await params;
  const supabase = await createServerSupabaseClient();
  const rows = await listCredentials(supabase, workspaceId);

  const valid = rows.filter((r) => r.status === "valid");
  const other = rows.filter((r) => r.status !== "valid");

  return (
    <main className="mx-auto flex min-h-svh max-w-4xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Credentials</h1>
          <p className="text-sm text-muted-foreground">
            Certifications, licences, and accreditations you can point to
            when eligibility rules ask for one.
          </p>
        </div>
        <Link href={`/workspaces/${workspaceId}`}>
          <Button variant="outline" size="sm">
            ← Workspace
          </Button>
        </Link>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
            Add credential
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <AddCredentialForm workspaceId={workspaceId} types={TYPES} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
            Valid ({valid.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {valid.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No valid credentials yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {valid.map((r) => (
                <CredentialRow
                  key={r.id}
                  row={r}
                  workspaceId={workspaceId}
                  issuedLabel={fmt(r.issue_date)}
                  expiresLabel={fmt(r.expiry_date)}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {other.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
              Expired / revoked ({other.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="flex flex-col gap-2">
              {other.map((r) => (
                <CredentialRow
                  key={r.id}
                  row={r}
                  workspaceId={workspaceId}
                  issuedLabel={fmt(r.issue_date)}
                  expiresLabel={fmt(r.expiry_date)}
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}

function fmt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return DHAKA_DATE.format(new Date(iso));
  } catch {
    return iso;
  }
}
