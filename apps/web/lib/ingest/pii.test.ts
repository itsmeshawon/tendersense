import { describe, expect, it } from "vitest";
import { looksLikePII, redactOfficialContact } from "./pii";

describe("looksLikePII", () => {
  it("flags official contact key names", () => {
    expect(looksLikePII("official_name", "Anwar Hossain")).toBe(true);
    expect(looksLikePII("officer_phone", "01711223344")).toBe(true);
    expect(looksLikePII("contact_email", "person@example.com")).toBe(true);
    expect(looksLikePII("focal_person", "Somebody")).toBe(true);
    expect(looksLikePII("OFFICIAL_NAME", "Anwar")).toBe(true);
  });

  it("flags Bangladeshi mobile numbers by value", () => {
    expect(looksLikePII("phone", "01711-223344")).toBe(true);
    expect(looksLikePII("phone", "+8801711223344")).toBe(true);
    expect(looksLikePII("random", "01711 223344")).toBe(true);
  });

  it("flags email addresses by value", () => {
    expect(looksLikePII("random", "someone@example.com")).toBe(true);
    expect(looksLikePII("random", "SOMEONE@Example.COM")).toBe(true);
  });

  it("does not flag benign fields", () => {
    expect(looksLikePII("title", "Supply and installation of ERP")).toBe(false);
    expect(looksLikePII("procurement_method", "ICB")).toBe(false);
    expect(looksLikePII("agency_name", "Ministry of ICT")).toBe(false);
    expect(looksLikePII("estimated_value_max", "1000000")).toBe(false);
  });
});

describe("redactOfficialContact", () => {
  it("redacts values whose keys look like official contact fields", () => {
    const input = {
      title: "ERP tender",
      official_name: "Anwar Hossain",
      official_phone: "01711223344",
      procurement_method: "ICB",
    };
    const out = redactOfficialContact(input);
    expect(out).toEqual({
      title: "ERP tender",
      official_name: "[REDACTED]",
      official_phone: "[REDACTED]",
      procurement_method: "ICB",
    });
  });

  it("redacts nested objects", () => {
    const input = {
      title: "T",
      contact: {
        officer_name: "Someone",
        officer_email: "s@example.com",
      },
    };
    const out = redactOfficialContact(input) as typeof input;
    expect(out.title).toBe("T");
    expect(out.contact.officer_name).toBe("[REDACTED]");
    expect(out.contact.officer_email).toBe("[REDACTED]");
  });

  it("redacts arrays of objects", () => {
    const input = {
      officials: [
        { official_name: "A", official_phone: "01711223344" },
        { official_name: "B" },
      ],
    };
    const out = redactOfficialContact(input) as typeof input;
    expect(out.officials[0].official_name).toBe("[REDACTED]");
    expect(out.officials[0].official_phone).toBe("[REDACTED]");
    expect(out.officials[1].official_name).toBe("[REDACTED]");
  });

  it("also redacts values that look like PII even if the key does not", () => {
    const input = {
      random_note: "Please contact someone@example.com or 01711-223344",
    };
    const out = redactOfficialContact(input) as typeof input;
    expect(out.random_note).toBe("[REDACTED]");
  });

  it("does not mutate the input", () => {
    const input = {
      official_name: "Anwar",
      title: "ERP",
    };
    redactOfficialContact(input);
    expect(input.official_name).toBe("Anwar");
  });

  it("returns primitives unchanged", () => {
    expect(redactOfficialContact("plain string")).toBe("plain string");
    expect(redactOfficialContact(42)).toBe(42);
    expect(redactOfficialContact(null)).toBe(null);
  });
});
