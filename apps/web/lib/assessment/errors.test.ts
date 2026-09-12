import { describe, expect, it } from "vitest";
import { QuotaExceededError } from "./errors";

describe("QuotaExceededError", () => {
  it("is an Error subclass with a stable name", () => {
    const e = new QuotaExceededError("nope");
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe("QuotaExceededError");
    expect(e.message).toBe("nope");
  });

  it("has a default message when omitted", () => {
    const e = new QuotaExceededError();
    expect(e.message.length).toBeGreaterThan(0);
  });
});
