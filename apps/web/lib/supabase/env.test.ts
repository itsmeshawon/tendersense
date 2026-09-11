import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  supabaseAnonKey,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "./env";

const KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

describe("supabase env accessors", () => {
  const original: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of KEYS) original[k] = process.env[k];
  });

  afterEach(() => {
    for (const k of KEYS) {
      if (original[k] === undefined) delete process.env[k];
      else process.env[k] = original[k];
    }
  });

  it("returns the URL when set", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54331";
    expect(supabaseUrl()).toBe("http://127.0.0.1:54331");
  });

  it("returns the anon key when set", () => {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-abc";
    expect(supabaseAnonKey()).toBe("anon-abc");
  });

  it("returns the service role key when set", () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-abc";
    expect(supabaseServiceRoleKey()).toBe("service-abc");
  });

  it("throws a helpful error when the URL is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(() => supabaseUrl()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("throws a helpful error when the anon key is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    expect(() => supabaseAnonKey()).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });

  it("throws a helpful error when the service role key is missing", () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(() => supabaseServiceRoleKey()).toThrow(
      /SUPABASE_SERVICE_ROLE_KEY/,
    );
  });

  it("throws on empty string (treat empty as missing)", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";
    expect(() => supabaseUrl()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });
});
