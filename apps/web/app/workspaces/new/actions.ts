"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createMyWorkspace } from "@/lib/workspaces/service";
import type { WorkspaceType } from "@/lib/workspaces/repository";

export type CreateWorkspaceFormState =
  | { status: "idle" }
  | { status: "error"; message: string; field?: "name" | "type" };

export async function createWorkspaceAction(
  _prev: CreateWorkspaceFormState,
  formData: FormData,
): Promise<CreateWorkspaceFormState> {
  const name = String(formData.get("name") ?? "");
  const rawType = String(formData.get("type") ?? "");
  const type = rawType as WorkspaceType;

  const result = await createMyWorkspace({ name, type });
  if (!result.ok) {
    return { status: "error", message: result.message, field: result.field };
  }

  revalidatePath("/workspaces");
  redirect("/workspaces");
}
