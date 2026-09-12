"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { lookupByCompanyName } from "@/lib/experience/egp-experience-client";
import type { ExperienceRecord } from "@/lib/experience/types";
import { importExperienceRecords } from "@/lib/workspaces/projects-service";

export type SearchState =
  | { status: "idle" }
  | { status: "searching" }
  | { status: "results"; records: ExperienceRecord[]; query: string }
  | { status: "error"; message: string };

export async function searchCompanyContracts(
  workspaceId: string,
  _prev: SearchState,
  formData: FormData,
): Promise<SearchState> {
  const query = String(formData.get("companyName") ?? "").trim();
  if (query.length === 0) {
    return { status: "error", message: "Type a company name to search." };
  }
  if (query.length < 3) {
    return {
      status: "error",
      message: "Enter at least 3 characters — 'Contains' match still needs a real name.",
    };
  }

  // Ignore the unused workspaceId param at compile time — it's still useful
  // when we later add per-workspace search caching / rate limiting.
  void workspaceId;

  try {
    const result = await lookupByCompanyName({
      companyName: query,
      match: "Contains",
      workStatus: "Completed",
      pageSize: 25,
    });
    return { status: "results", records: result.records, query };
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
