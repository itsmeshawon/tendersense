import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listMonitoringProfiles } from "@/lib/monitoring/repository";
import { NewProfileForm } from "./new-profile-form";
import { ProfileRowActions } from "./profile-row-actions";

export default async function MonitoringPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const { id: workspaceId } = await params;
  const supabase = await createServerSupabaseClient();
  const profiles = await listMonitoringProfiles(supabase, workspaceId);

  const activeCount = profiles.filter((p) => p.is_active).length;

  return (
    <main className="mx-auto flex min-h-svh max-w-4xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Monitoring profiles
          </h1>
          <p className="text-sm text-muted-foreground">
            Save a filter set so we can flag new tenders + amendments that
            match. Free plan supports one active profile.
          </p>
        </div>
      </header>

      <section className="rounded-md border p-4">
        <h2 className="text-sm font-semibold">New profile</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Fields with multiple values accept comma-separated input
          (e.g., <code>road, bridge, culvert</code>).
        </p>
        <NewProfileForm workspaceId={workspaceId} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">
          {profiles.length === 0
            ? "No profiles yet"
            : `${profiles.length} profile${profiles.length === 1 ? "" : "s"} · ${activeCount} active`}
        </h2>
        {profiles.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            Once you create a profile, it&rsquo;ll drive personalized
            recommendations on <code>/opportunities</code> and future
            amendment alerts.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {profiles.map((p) => (
              <li
                key={p.id}
                className="flex flex-col gap-2 rounded-md border p-4 text-sm"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-medium">{p.name}</h3>
                  <span
                    className={
                      p.is_active
                        ? "shrink-0 rounded-full border border-green-600 px-2 py-0.5 text-xs text-green-700"
                        : "shrink-0 rounded-full border px-2 py-0.5 text-xs text-muted-foreground"
                    }
                  >
                    {p.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
                  <FilterCell label="Countries" values={p.country_codes} />
                  <FilterCell label="Sources" values={p.source_keys} />
                  <FilterCell label="Sectors" values={p.sectors} />
                  <FilterCell label="Methods" values={p.procurement_methods} />
                  <FilterCell label="Keywords" values={p.keywords} />
                  <FilterCell
                    label="Excluded"
                    values={p.excluded_keywords}
                  />
                  <FilterCell
                    label="Min days"
                    values={
                      p.min_days_remaining !== null
                        ? [String(p.min_days_remaining)]
                        : []
                    }
                  />
                  <FilterCell
                    label="Value range"
                    values={
                      p.min_value !== null || p.max_value !== null
                        ? [
                            `${p.min_value ?? "0"}–${p.max_value ?? "∞"} ${p.currency ?? ""}`,
                          ]
                        : []
                    }
                  />
                </dl>
                <ProfileRowActions
                  workspaceId={workspaceId}
                  profileId={p.id}
                  isActive={p.is_active}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function FilterCell({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <dt className="font-semibold text-foreground">{label}</dt>
      <dd className="truncate">{values.length ? values.join(", ") : "—"}</dd>
    </div>
  );
}
