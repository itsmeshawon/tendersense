import { describe, expect, it, vi } from "vitest";
import {
  FREE_MONTHLY_LIMIT,
  currentPeriodKey,
  getUsage,
  incrementUsage,
} from "./quota";

function fakeSelect(v: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: v, error: null });
  const eq2 = vi.fn(() => ({ maybeSingle }));
  const eq1 = vi.fn(() => ({ eq: eq2 }));
  const select = vi.fn(() => ({ eq: eq1 }));
  return { from: vi.fn(() => ({ select })), _spies: { select, eq1, eq2, maybeSingle } };
}

function fakeUpsert() {
  const upsert = vi.fn().mockResolvedValue({ data: null, error: null });
  return { from: vi.fn(() => ({ upsert })), _spies: { upsert } };
}

describe("currentPeriodKey", () => {
  it("returns the first day of the given month as YYYY-MM-01 (UTC)", () => {
    expect(currentPeriodKey(new Date("2026-09-13T10:00:00Z"))).toBe("2026-09-01");
    expect(currentPeriodKey(new Date("2027-01-01T00:00:00Z"))).toBe("2027-01-01");
  });
});

describe("getUsage", () => {
  it("returns 0/limit when no row exists yet", async () => {
    const c = fakeSelect(null);
    const u = await getUsage(
      c as unknown as Parameters<typeof getUsage>[0],
      "ws-1",
      "free",
      new Date("2026-09-13T00:00:00Z"),
    );
    expect(u.used).toBe(0);
    expect(u.limit).toBe(FREE_MONTHLY_LIMIT);
    expect(u.remaining).toBe(FREE_MONTHLY_LIMIT);
  });

  it("returns unlimited=true for pro plan", async () => {
    const c = fakeSelect({ assessments_used: 42 });
    const u = await getUsage(
      c as unknown as Parameters<typeof getUsage>[0],
      "ws-1",
      "pro",
      new Date("2026-09-13T00:00:00Z"),
    );
    expect(u.unlimited).toBe(true);
    expect(u.used).toBe(42);
    expect(u.remaining).toBe(Number.POSITIVE_INFINITY);
  });

  it("returns exhausted=true when free-plan usage hits the limit", async () => {
    const c = fakeSelect({ assessments_used: FREE_MONTHLY_LIMIT });
    const u = await getUsage(
      c as unknown as Parameters<typeof getUsage>[0],
      "ws-1",
      "free",
      new Date("2026-09-13T00:00:00Z"),
    );
    expect(u.remaining).toBe(0);
    expect(u.exhausted).toBe(true);
  });
});

describe("incrementUsage", () => {
  it("upserts by (workspace_id, period_month)", async () => {
    const c = fakeUpsert();
    await incrementUsage(
      c as unknown as Parameters<typeof incrementUsage>[0],
      "ws-1",
      2,
      new Date("2026-09-13T00:00:00Z"),
    );
    expect(c._spies.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: "ws-1",
        period_month: "2026-09-01",
        assessments_used: 3,
      }),
      expect.objectContaining({ onConflict: "workspace_id,period_month" }),
    );
  });
});
