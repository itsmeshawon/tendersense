import { describe, expect, it, vi } from "vitest";
import { loadWorkspaceSnapshot, normalizedKeyForCredential } from "./snapshot";

describe("normalizedKeyForCredential", () => {
  it("derives iso_NNNN from an ISO credential row", () => {
    expect(
      normalizedKeyForCredential({
        credential_type: "iso",
        name: "ISO 27001",
        credential_number: "27001",
      }),
    ).toBe("iso_27001");
  });

  it("derives cmmi_dev for CMMI rows", () => {
    expect(
      normalizedKeyForCredential({
        credential_type: "cmmi",
        name: "CMMI Level 3 Dev",
        credential_number: null,
      }),
    ).toBe("cmmi_dev");
  });

  it("returns null when nothing matches", () => {
    expect(
      normalizedKeyForCredential({
        credential_type: "other",
        name: "Custom badge",
        credential_number: null,
      }),
    ).toBeNull();
  });
});

function fakeClient(responses: Record<string, unknown>) {
  const from = vi.fn((table: string) => {
    const payload = responses[table];
    const eq = vi.fn(() => ({
      order: vi.fn().mockResolvedValue({ data: payload, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({
        data: Array.isArray(payload) ? payload[0] ?? null : payload,
        error: null,
      }),
      then: (cb: (v: unknown) => unknown) =>
        Promise.resolve({ data: payload, error: null }).then(cb),
    }));
    const select = vi.fn(() => ({
      eq,
      order: vi.fn().mockResolvedValue({ data: payload, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({
        data: Array.isArray(payload) ? payload[0] ?? null : payload,
        error: null,
      }),
    }));
    return { select };
  });
  return { from };
}

describe("loadWorkspaceSnapshot", () => {
  it("composes creds/projects/financials/workforce/country into a snapshot", async () => {
    const client = fakeClient({
      workspaces: [{ country_code: "BD" }],
      workspace_credentials: [
        {
          credential_type: "iso",
          name: "ISO 27001",
          credential_number: "27001",
          status: "valid",
          expiry_date: null,
          id: "c1",
        },
      ],
      projects: [{ id: "p1", name: "Gov Portal", sector: "gov" }],
      workspace_financials: [
        {
          annual_turnover: 600_000_000,
          is_audited: true,
        },
      ],
      workspace_workforce: [{ total_employees: 320 }],
    });
    const snap = await loadWorkspaceSnapshot(
      client as unknown as Parameters<typeof loadWorkspaceSnapshot>[0],
      "ws-1",
    );
    expect(snap.countryCode).toBe("BD");
    expect(snap.credentials[0].normalizedKey).toBe("iso_27001");
    expect(snap.pastProjects[0].sector).toBe("gov");
    expect(snap.financials?.annualRevenue).toBe(600_000_000);
    expect(snap.financials?.hasAudited).toBe(true);
    expect(snap.workforce?.totalEmployees).toBe(320);
  });
});
