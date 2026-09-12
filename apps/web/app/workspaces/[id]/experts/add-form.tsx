"use client";

import { useTransition } from "react";
import { addExpertAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function AddExpertForm({ workspaceId }: { workspaceId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        startTransition(async () => {
          await addExpertAction(workspaceId, fd);
          form.reset();
        });
      }}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name *</Label>
        <Input id="name" name="name" required placeholder="e.g. Dr. Rahim Karim" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="role">Role</Label>
        <Input id="role" name="role" placeholder="e.g. ERP Lead" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="years_experience">Years of experience</Label>
        <Input
          id="years_experience"
          name="years_experience"
          type="number"
          min={0}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="availability">Availability</Label>
        <select id="availability" name="availability" className={SELECT_CLASS}>
          <option value="">—</option>
          <option value="full_time">Full-time</option>
          <option value="part_time">Part-time</option>
          <option value="short_term">Short-term</option>
          <option value="on_demand">On-demand</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="sectors">Sectors (comma separated)</Label>
        <Input
          id="sectors"
          name="sectors"
          placeholder="Banking, Government, Microfinance"
        />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add expert"}
        </Button>
      </div>
    </form>
  );
}
