"use client";

import { useActionState } from "react";
import {
  createProfileAction,
  type CreateMonitoringProfileState,
} from "./actions";

export function NewProfileForm({ workspaceId }: { workspaceId: string }) {
  const [state, formAction, pending] = useActionState<
    CreateMonitoringProfileState,
    FormData
  >(
    async (prev, fd) => createProfileAction(workspaceId, prev, fd),
    { status: "idle" },
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field name="name" label="Name" required placeholder="BD infrastructure" />
        <Field
          name="country_codes"
          label="Countries (ISO codes)"
          placeholder="BD, IN"
        />
        <Field
          name="source_keys"
          label="Sources"
          placeholder="world_bank, bd_egp"
        />
        <Field name="sectors" label="Sectors" placeholder="ICT, roads" />
        <Field
          name="procurement_methods"
          label="Methods"
          placeholder="OTM, LTM"
        />
        <Field
          name="keywords"
          label="Keywords"
          placeholder="road, bridge, ERP"
        />
        <Field
          name="excluded_keywords"
          label="Excluded keywords"
          placeholder="training, consultancy"
        />
        <Field
          name="min_days_remaining"
          label="Min days remaining"
          placeholder="7"
          type="number"
        />
        <Field
          name="min_value"
          label="Min value"
          placeholder="100000"
          type="number"
        />
        <Field
          name="max_value"
          label="Max value"
          placeholder="10000000"
          type="number"
        />
        <Field name="currency" label="Currency" placeholder="BDT" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked
          className="h-4 w-4"
        />
        <span>Active</span>
      </label>
      {state.status === "error" ? (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {state.message}
        </p>
      ) : null}
      {state.status === "created" ? (
        <p className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          Profile created.
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create profile"}
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  placeholder,
  required,
  type = "text",
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-semibold text-foreground">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        className="rounded-md border px-3 py-2 text-sm"
      />
    </label>
  );
}
