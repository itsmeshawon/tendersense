import { describe, expect, it, vi } from "vitest";
import {
  createMonitoringProfile,
  deleteMonitoringProfile,
  FreePlanLimitError,
  listMonitoringProfiles,
  setMonitoringProfileActive,
  type MonitoringProfile,
} from "./repository";

const sample: MonitoringProfile = {
  id: "prof-1",
  workspace_id: "ws-1",
  created_by: "user-1",
  name: "BD infra",
  is_active: true,
  country_codes: ["BD"],
  source_keys: ["bd_egp"],
  sectors: [],
  procurement_methods: [],
  keywords: ["road", "bridge"],
  excluded_keywords: [],
  min_value: null,
  max_value: null,
  currency: null,
  min_days_remaining: 7,
  created_at: "2026-09-12T00:00:00Z",
  updated_at: "2026-09-12T00:00:00Z",
};

function fakeSelectChain(finalValue: unknown) {
  const orderMock = vi.fn().mockResolvedValue(finalValue);
  const eqMock = vi.fn(() => ({ order: orderMock }));
  const selectMock = vi.fn(() => ({ eq: eqMock }));
  return {
    from: vi.fn(() => ({ select: selectMock })),
    _spies: { selectMock, eqMock, orderMock },
  };
}

function fakeUpdateChain(finalValue: unknown) {
  const eqMock = vi.fn().mockResolvedValue(finalValue);
  const updateMock = vi.fn(() => ({ eq: eqMock }));
  return {
    from: vi.fn(() => ({ update: updateMock })),
    _spies: { updateMock, eqMock },
  };
}

function fakeDeleteChain(finalValue: unknown) {
  const eqMock = vi.fn().mockResolvedValue(finalValue);
  const deleteMock = vi.fn(() => ({ eq: eqMock }));
  return {
    from: vi.fn(() => ({ delete: deleteMock })),
    _spies: { deleteMock, eqMock },
  };
}

describe("listMonitoringProfiles", () => {
  it("queries by workspace_id and orders by created_at desc", async () => {
    const client = fakeSelectChain({ data: [sample], error: null });
    const rows = await listMonitoringProfiles(
      client as unknown as Parameters<typeof listMonitoringProfiles>[0],
      "ws-1",
    );
    expect(rows).toEqual([sample]);
    expect(client._spies.eqMock).toHaveBeenCalledWith("workspace_id", "ws-1");
    expect(client._spies.orderMock).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
  });

  it("returns [] when null data", async () => {
    const client = fakeSelectChain({ data: null, error: null });
    await expect(
      listMonitoringProfiles(
        client as unknown as Parameters<typeof listMonitoringProfiles>[0],
        "ws-1",
      ),
    ).resolves.toEqual([]);
  });

  it("throws when supabase returns error", async () => {
    const client = fakeSelectChain({
      data: null,
      error: { message: "no perms" },
    });
    await expect(
      listMonitoringProfiles(
        client as unknown as Parameters<typeof listMonitoringProfiles>[0],
        "ws-1",
      ),
    ).rejects.toThrow(/no perms/);
  });
});

describe("createMonitoringProfile", () => {
  it("calls the RPC with all parameters mapped", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: sample, error: null });
    const client = { rpc };
    const result = await createMonitoringProfile(
      client as unknown as Parameters<typeof createMonitoringProfile>[0],
      {
        workspaceId: "ws-1",
        name: "BD infra",
        countryCodes: ["BD"],
        sourceKeys: ["bd_egp"],
        keywords: ["road", "bridge"],
        minDaysRemaining: 7,
      },
    );
    expect(result).toEqual(sample);
    expect(rpc).toHaveBeenCalledWith(
      "create_monitoring_profile",
      expect.objectContaining({
        p_workspace_id: "ws-1",
        p_name: "BD infra",
        p_country_codes: ["BD"],
        p_source_keys: ["bd_egp"],
        p_keywords: ["road", "bridge"],
        p_min_days_remaining: 7,
        p_is_active: true,
      }),
    );
  });

  it("maps MP_FREE_LIMIT error to FreePlanLimitError", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "MP_FREE_LIMIT: Free plan supports one active" },
    });
    const client = { rpc };
    await expect(
      createMonitoringProfile(
        client as unknown as Parameters<typeof createMonitoringProfile>[0],
        { workspaceId: "ws-1", name: "another" },
      ),
    ).rejects.toBeInstanceOf(FreePlanLimitError);
  });

  it("throws generic Error for other RPC failures", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "boom" },
    });
    const client = { rpc };
    await expect(
      createMonitoringProfile(
        client as unknown as Parameters<typeof createMonitoringProfile>[0],
        { workspaceId: "ws-1", name: "x" },
      ),
    ).rejects.toThrow(/boom/);
  });
});

describe("setMonitoringProfileActive", () => {
  it("updates is_active on the profile row", async () => {
    const client = fakeUpdateChain({ error: null });
    await setMonitoringProfileActive(
      client as unknown as Parameters<typeof setMonitoringProfileActive>[0],
      "prof-1",
      false,
    );
    expect(client._spies.updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ is_active: false }),
    );
    expect(client._spies.eqMock).toHaveBeenCalledWith("id", "prof-1");
  });
});

describe("deleteMonitoringProfile", () => {
  it("deletes by profile id", async () => {
    const client = fakeDeleteChain({ error: null });
    await deleteMonitoringProfile(
      client as unknown as Parameters<typeof deleteMonitoringProfile>[0],
      "prof-1",
    );
    expect(client._spies.eqMock).toHaveBeenCalledWith("id", "prof-1");
  });
});
