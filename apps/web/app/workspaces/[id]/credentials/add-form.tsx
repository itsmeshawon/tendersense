"use client";

import { useTransition } from "react";
import { addCredentialAction } from "./actions";
import { CREDENTIAL_TYPE_LABEL, type CredentialType } from "@/lib/credentials/repository";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function AddCredentialForm({
  workspaceId,
  types,
}: {
  workspaceId: string;
  types: CredentialType[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        startTransition(async () => {
          await addCredentialAction(workspaceId, fd);
          form.reset();
        });
      }}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="type">Type *</Label>
        <select id="type" name="type" required className={SELECT_CLASS}>
          {types.map((t) => (
            <option key={t} value={t}>
              {CREDENTIAL_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          name="name"
          required
          placeholder="e.g. ISO 27001:2022"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="issuer">Issuer</Label>
        <Input id="issuer" name="issuer" placeholder="e.g. BSI" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="credential_number">Credential number</Label>
        <Input
          id="credential_number"
          name="credential_number"
          placeholder="e.g. IS-12345"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="issue_date">Issue date</Label>
        <Input id="issue_date" name="issue_date" type="date" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="expiry_date">Expiry date</Label>
        <Input id="expiry_date" name="expiry_date" type="date" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="country_code">Country</Label>
        <Input
          id="country_code"
          name="country_code"
          maxLength={2}
          placeholder="BD"
        />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add credential"}
        </Button>
      </div>
    </form>
  );
}
