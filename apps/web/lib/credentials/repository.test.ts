import { describe, expect, it, vi } from "vitest";
import {
  createCredential,
  deleteCredential,
  listCredentials,
  updateCredentialStatus,
  type CredentialRow,
} from "./repository";

const sample: CredentialRow = {
  id: "c-1",
  workspace_id: "ws-1",
  credential_type: "iso",
  name: "ISO 27001:2022",
  issuer: "BSI",
  credential_number: "IS-12345",
  issue_date: "2024-06-01",
  expiry_date: "2027-06-01",
  status: "valid",
  country_code: "BD",
  evidence_document_id: null,
  created_by: "user-1",
  created_at: "2026-09-13T00:00:00Z",
  updated_at: "2026-09-13T00:00:00Z",
};

function fakeSelect(v: unknown) {
  const order = vi.fn().mockResolvedValue(v);
  const eq = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ eq }));
  return { from: vi.fn(() => ({ select })), _spies: { select, eq, order } };
}

function fakeInsert(v: unknown) {
  const single = vi.fn().mockResolvedValue(v);
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));
  return { from: vi.fn(() => ({ insert })), _spies: { insert, select, single } };
}

function fakeUpdate(v: unknown) {
  const eq = vi.fn().mockResolvedValue(v);
  const update = vi.fn(() => ({ eq }));
  return { from: vi.fn(() => ({ update })), _spies: { update, eq } };
}

function fakeDelete(v: unknown) {
  const eq = vi.fn().mockResolvedValue(v);
  const del = vi.fn(() => ({ eq }));
  return { from: vi.fn(() => ({ delete: del })), _spies: { del, eq } };
}

describe("listCredentials", () => {
  it("filters by workspace and orders by expiry", async () => {
    const c = fakeSelect({ data: [sample], error: null });
    const rows = await listCredentials(
      c as unknown as Parameters<typeof listCredentials>[0],
      "ws-1",
    );
    expect(rows).toEqual([sample]);
    expect(c._spies.eq).toHaveBeenCalledWith("workspace_id", "ws-1");
  });
});

describe("createCredential", () => {
  it("inserts a row with the workspace id + type + name", async () => {
    const c = fakeInsert({ data: sample, error: null });
    const r = await createCredential(
      c as unknown as Parameters<typeof createCredential>[0],
      {
        workspaceId: "ws-1",
        createdBy: "user-1",
        type: "iso",
        name: "ISO 27001:2022",
        issuer: "BSI",
        credentialNumber: "IS-12345",
        issueDate: "2024-06-01",
        expiryDate: "2027-06-01",
      },
    );
    expect(r).toEqual(sample);
    expect(c._spies.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: "ws-1",
        credential_type: "iso",
        name: "ISO 27001:2022",
      }),
    );
  });
});

describe("updateCredentialStatus", () => {
  it("sets status on an id", async () => {
    const c = fakeUpdate({ error: null });
    await updateCredentialStatus(
      c as unknown as Parameters<typeof updateCredentialStatus>[0],
      "c-1",
      "expired",
    );
    expect(c._spies.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "expired" }),
    );
    expect(c._spies.eq).toHaveBeenCalledWith("id", "c-1");
  });
});

describe("deleteCredential", () => {
  it("deletes by id", async () => {
    const c = fakeDelete({ error: null });
    await deleteCredential(
      c as unknown as Parameters<typeof deleteCredential>[0],
      "c-1",
    );
    expect(c._spies.eq).toHaveBeenCalledWith("id", "c-1");
  });
});
