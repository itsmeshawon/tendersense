import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHttpClient } from "./http";

const okResponse = (body = "hello", status = 200) =>
  new Response(body, { status, headers: { "content-type": "text/plain" } });

// Response bodies can only be read once. When a mock returns the same
// Response for multiple calls, the second read throws. Wrapping in a
// factory ensures each call gets a fresh Response.
const okResponseFactory = (body = "hello", status = 200) =>
  vi.fn().mockImplementation(() => Promise.resolve(okResponse(body, status)));

describe("createHttpClient — get", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends the configured user agent", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse());
    const client = createHttpClient({
      userAgent: "TenderSenseBot/0.1 (+https://tendersense.app)",
      fetchImpl,
    });
    await client.get("https://example.com/x");
    const [, init] = fetchImpl.mock.calls[0];
    const headers = init.headers as Record<string, string>;
    expect(headers["user-agent"]).toBe(
      "TenderSenseBot/0.1 (+https://tendersense.app)",
    );
  });

  it("returns status + body for 2xx", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse("ok body", 200));
    const client = createHttpClient({ userAgent: "T", fetchImpl });
    const res = await client.get("https://example.com/x");
    expect(res.status).toBe(200);
    expect(res.body).toBe("ok body");
  });

  it("returns non-5xx errors without retrying (4xx is client-side)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse("not found", 404));
    const client = createHttpClient({
      userAgent: "T",
      fetchImpl,
      maxRetries: 3,
    });
    const res = await client.get("https://example.com/x");
    expect(res.status).toBe(404);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries on 5xx and eventually succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(okResponse("boom", 503))
      .mockResolvedValueOnce(okResponse("boom", 502))
      .mockResolvedValueOnce(okResponse("hello", 200));
    const client = createHttpClient({
      userAgent: "T",
      fetchImpl,
      maxRetries: 3,
      // Zero backoff so the test runs fast; the shape (retry, retry, succeed)
      // is what we care about.
      backoffMs: () => 0,
    });
    const res = await client.get("https://example.com/x");
    expect(res.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("throws after maxRetries consecutive 5xx", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(okResponse("boom", 500));
    const client = createHttpClient({
      userAgent: "T",
      fetchImpl,
      maxRetries: 2,
      backoffMs: () => 0,
    });
    await expect(client.get("https://example.com/x")).rejects.toThrow(
      /after 2 attempts/,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("retries on network error (thrown fetch)", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValueOnce(okResponse("ok", 200));
    const client = createHttpClient({
      userAgent: "T",
      fetchImpl,
      maxRetries: 2,
      backoffMs: () => 0,
    });
    const res = await client.get("https://example.com/x");
    expect(res.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("aborts on timeout", async () => {
    const fetchImpl: typeof fetch = vi.fn(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          (init as RequestInit | undefined)?.signal?.addEventListener(
            "abort",
            () => {
              reject(new DOMException("aborted", "AbortError"));
            },
          );
        }),
    );
    const client = createHttpClient({
      userAgent: "T",
      fetchImpl,
      maxRetries: 1,
      timeoutMs: 20,
      backoffMs: () => 0,
    });
    await expect(client.get("https://example.com/slow")).rejects.toThrow(
      /after 1 attempts|aborted/i,
    );
  });

  it("respects minIntervalMs between consecutive requests", async () => {
    const fetchImpl = okResponseFactory();
    const client = createHttpClient({
      userAgent: "T",
      fetchImpl,
      minIntervalMs: 50,
    });
    const t0 = Date.now();
    await client.get("https://example.com/1");
    await client.get("https://example.com/2");
    const elapsed = Date.now() - t0;
    // Generous lower bound to avoid flake; the point is the second call
    // waits for the interval to elapse.
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });
});
