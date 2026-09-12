/**
 * Small HTTP client for source adapters.
 *
 * Responsibilities:
 *   - Add a descriptive User-Agent (SoT §10.2)
 *   - Enforce a timeout (default 30s)
 *   - Retry on 5xx and network errors with exponential backoff
 *   - Optional minimum interval between successive requests
 *     (SoT §10.2 — "single concurrent request, 3–5s between details")
 *
 * `fetchImpl` is injectable so tests never touch the network.
 */

export interface HttpClientOptions {
  userAgent: string;
  timeoutMs?: number;
  maxRetries?: number;
  minIntervalMs?: number;
  fetchImpl?: typeof fetch;
  /** Milliseconds to wait before retry attempt N (N starts at 1). */
  backoffMs?: (attempt: number) => number;
  /** Injectable sleep for testing. */
  sleepMs?: (ms: number) => Promise<void>;
}

export interface HttpResponse {
  status: number;
  headers: Headers;
  body: string;
}

export interface HttpClient {
  get(url: string): Promise<HttpResponse>;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_MIN_INTERVAL_MS = 0;

function defaultBackoff(attempt: number): number {
  return Math.min(30_000, 500 * Math.pow(2, attempt - 1));
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createHttpClient(opts: HttpClientOptions): HttpClient {
  const timeout = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
  const minInterval = opts.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const backoff = opts.backoffMs ?? defaultBackoff;
  const sleep = opts.sleepMs ?? defaultSleep;

  let lastRequestAt = 0;

  async function get(url: string): Promise<HttpResponse> {
    const waitMs = Math.max(0, lastRequestAt + minInterval - Date.now());
    if (waitMs > 0) await sleep(waitMs);

    let attempt = 0;
    let lastError: unknown;

    while (attempt < maxRetries) {
      attempt++;
      lastRequestAt = Date.now();

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      try {
        const res = await fetchImpl(url, {
          headers: { "user-agent": opts.userAgent },
          signal: controller.signal,
        });
        clearTimeout(timer);

        const body = await res.text();

        if (res.status >= 500) {
          // Retry on server error
          lastError = new Error(`upstream ${res.status}`);
          if (attempt < maxRetries) await sleep(backoff(attempt));
          continue;
        }

        return { status: res.status, headers: res.headers, body };
      } catch (err) {
        clearTimeout(timer);
        lastError = err;
        if (attempt < maxRetries) await sleep(backoff(attempt));
      }
    }

    throw new Error(
      `fetch failed after ${maxRetries} attempts: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`,
    );
  }

  return { get };
}
