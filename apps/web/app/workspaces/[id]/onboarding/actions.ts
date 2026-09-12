"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { lookupByCompanyName } from "@/lib/experience/egp-experience-client";
import type { ExperienceRecord } from "@/lib/experience/types";
import { importExperienceRecords } from "@/lib/workspaces/projects-service";

// e-GP servlet responses run 3-8s in practice. Vercel's default 10s ceiling
// leaves no headroom for the two round-trips (session GET + search POST) plus
// parsing. Bump to 30s so the search completes on serverless runs.
export const maxDuration = 30;

export type WorkStatusFilter = "All" | "Completed" | "Ongoing";

export type SearchState =
  | { status: "idle" }
  | { status: "searching" }
  | {
      status: "results";
      records: ExperienceRecord[];
      query: string;
      workStatus: WorkStatusFilter;
    }
  | { status: "error"; message: string };

export async function searchCompanyContracts(
  workspaceId: string,
  _prev: SearchState,
  formData: FormData,
): Promise<SearchState> {
  const query = String(formData.get("companyName") ?? "").trim();
  const workStatusRaw = String(formData.get("workStatus") ?? "All");
  const workStatus: WorkStatusFilter =
    workStatusRaw === "Completed" || workStatusRaw === "Ongoing"
      ? workStatusRaw
      : "All";

  if (query.length === 0) {
    return { status: "error", message: "Type a company name to search." };
  }
  if (query.length < 3) {
    return {
      status: "error",
      message:
        "Enter at least 3 characters — 'Contains' match still needs a real name.",
    };
  }

  // Ignore the unused workspaceId param at compile time — it's still useful
  // when we later add per-workspace search caching / rate limiting.
  void workspaceId;

  try {
    const result = await lookupByCompanyName({
      companyName: query,
      match: "Contains",
      workStatus,
      pageSize: 25,
    });
    return { status: "results", records: result.records, query, workStatus };
  } catch (err) {
    return {
      status: "error",
      message:
        err instanceof Error
          ? `Lookup failed: ${err.message}`
          : "Lookup failed for an unknown reason.",
    };
  }
}

export async function importSelectedContracts(
  workspaceId: string,
  records: ExperienceRecord[],
): Promise<void> {
  await importExperienceRecords(workspaceId, records);
  revalidatePath("/workspaces");
  revalidatePath(`/workspaces/${workspaceId}/onboarding`);
  redirect("/workspaces");
}
