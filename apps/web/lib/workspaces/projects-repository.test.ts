import { describe, expect, it, vi } from "vitest";
import {
  insertProjects,
  listWorkspaceProjects,
  type ProjectInsert,
  type ProjectRow,
} from "./projects-repository";

function fakeSelectClient(builder: { limit?: unknown }) {
  const orderMock = vi.fn().mockResolvedValue(builder.limit);
  const eqMock = vi.fn(() => ({ order: orderMock }));
  const selectMock = vi.fn(() => ({ eq: eqMock }));
  const fromMock = vi.fn(() => ({ select: selectMock }));
  return {
    from: fromMock,
    _spies: { fromMock, selectMock, eqMock, orderMock },
  };
}

function fakeInsertClient(builder: { insert?: unknown }) {
  const insertMock = vi.fn().mockResolvedValue(builder.insert);
  const fromMock = vi.fn(() => ({ insert: insertMock }));
  return { from: fromMock, _spies: { fromMock, insertMock } };
}

const sampleRow: ProjectRow = {
  id: "p-1",
  workspace_id: "w-1",
  name: "Contract A",
  client_name: "Ministry X",
  country_code: "BD",
  sector: "ICT",
  start_date: "2023-10-02",
  end_date: "2024-02-11",
  contract_value: 5000000,
  currency: "BDT",
  summary: null,
  services: null,
  technologies: null,
  evidence_credential_number: "CERT-1",
  is_public: false,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("listWorkspaceProjects", () => {
  it("selects * from projects filtered by workspace_id, newest first", async () => {
    const client = fakeSelectClient({
      limit: { data: [sampleRow], error: null },
    });
    const rows = await listWorkspaceProjects(
      client as unknown as Parameters<typeof listWorkspaceProjects>[0],
      "w-1",
    );
    expect(rows).toEqual([sampleRow]);
    expect(client._spies.fromMock).toHaveBeenCalledWith("projects");
    expect(client._spies.eqMock).toHaveBeenCalledWith("workspace_id", "w-1");
    expect(client._spies.orderMock).toHaveBeenCalledWith("end_date", {
      ascending: false,
      nullsFirst: false,
    });
  });

  it("returns [] on null data", async () => {
    const client = fakeSelectClient({ limit: { data: null, error: null } });
    await expect(
      listWorkspaceProjects(
        client as unknown as Parameters<typeof listWorkspaceProjects>[0],
        "w-1",
      ),
    ).resolves.toEqual([]);
  });

  it("throws on supabase error", async () => {
    const client = fakeSelectClient({
      limit: { data: null, error: { message: "boom" } },
    });
    await expect(
      listWorkspaceProjects(
        client as unknown as Parameters<typeof listWorkspaceProjects>[0],
        "w-1",
      ),
    ).rejects.toThrow(/boom/);
  });
});

describe("insertProjects", () => {
  const inputs: ProjectInsert[] = [
    {
      workspace_id: "w-1",
      name: "Contract A",
      client_name: "Ministry X",
      contract_value: 5000000,
      currency: "BDT",
      start_date: "2023-10-02",
      end_date: "2024-02-11",
      evidence_credential_number: "CERT-1",
    },
    {
      workspace_id: "w-1",
      name: "Contract B",
      client_name: "Ministry Y",
      contract_value: 3000000,
      currency: "BDT",
      start_date: "2024-01-01",
      end_date: "2024-06-30",
      evidence_credential_number: "CERT-2",
    },
  ];

  it("returns 0 when the input array is empty (no supabase call)", async () => {
    const client = fakeInsertClient({});
    const count = await insertProjects(
      client as unknown as Parameters<typeof insertProjects>[0],
      [],
    );
    expect(count).toBe(0);
    expect(client._spies.fromMock).not.toHaveBeenCalled();
  });

  it("inserts each row and returns the count", async () => {
    const client = fakeInsertClient({ insert: { data: inputs, error: null } });
    const count = await insertProjects(
      client as unknown as Parameters<typeof insertProjects>[0],
      inputs,
    );
    expect(count).toBe(2);
    expect(client._spies.fromMock).toHaveBeenCalledWith("projects");
    expect(client._spies.insertMock).toHaveBeenCalledWith(inputs);
  });

  it("throws on supabase error", async () => {
    const client = fakeInsertClient({
      insert: { data: null, error: { message: "insert failed" } },
    });
    await expect(
      insertProjects(
        client as unknown as Parameters<typeof insertProjects>[0],
        inputs,
      ),
    ).rejects.toThrow(/insert failed/);
  });
});
