import { AppError, httpStatusToErrorCode, parseRetryAfter } from "@valhub/domain";
import type { ProviderLimiter } from "./rate-limit";
import { logger } from "./logger";

export interface FetchOptions {
  method?: "GET" | "POST" | "PUT";
  headers?: Record<string, string>;
  body?: string | URLSearchParams;
  timeoutMs?: number;
  /** Retries for retryable failures only (network/timeout/5xx). */
  retries?: number;
  limiter?: ProviderLimiter;
  signal?: AbortSignal;
}

export type FetchImpl = typeof fetch;

let fetchImpl: FetchImpl = (...args) => fetch(...args);

/** Test seam: swap the global fetch used by all adapters. */
export function setFetchImpl(impl: FetchImpl): void {
  fetchImpl = impl;
}

const USER_AGENT = "VALHUB/0.1 (mobile)";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Full-jitter exponential backoff. */
function backoffDelay(attempt: number, baseMs = 250, capMs = 4000, random: () => number = Math.random): number {
  const exp = Math.min(capMs, baseMs * 2 ** attempt);
  return Math.round(random() * exp);
}

async function fetchOnce(url: string, options: FetchOptions): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error("timeout")), options.timeoutMs ?? 8000);
  const onAbort = () => controller.abort(options.signal?.reason);
  options.signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const init: RequestInit = {
      method: options.method ?? "GET",
      headers: { "user-agent": USER_AGENT, accept: "application/json, text/html;q=0.9", ...options.headers },
      signal: controller.signal,
    };
    if (options.body !== undefined) init.body = options.body;
    return await fetchImpl(url, init);
  } catch (error) {
    if (controller.signal.aborted && !options.signal?.aborted) {
      throw new AppError("TIMEOUT", `Upstream timed out: ${new URL(url).host}`, { cause: error });
    }
    throw new AppError("NETWORK", `Upstream unreachable: ${new URL(url).host}`, { cause: error });
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", onAbort);
  }
}

/**
 * Fetches with timeout, typed errors, provider rate limiting and bounded retry. Never
 * retries 4xx (including 401/403/429) — a 429 blocks the provider limiter instead.
 */
async function fetchResponse(url: string, options: FetchOptions = {}): Promise<Response> {
  const retries = options.retries ?? 2;
  let attempt = 0;
  for (;;) {
    options.limiter?.acquire();
    try {
      const res = await fetchOnce(url, options);
      if (res.ok) return res;

      const retryAfter = parseRetryAfter(res.headers.get("retry-after"));
      const code = httpStatusToErrorCode(res.status);
      if (res.status === 429) {
        options.limiter?.block(retryAfter ?? 30);
      }
      const error = new AppError(code, `Upstream ${new URL(url).host} responded ${res.status}`, {
        ...(retryAfter !== undefined ? { retryAfter } : {}),
      });
      // Drain body so the connection can be reused.
      await res.body?.cancel().catch(() => undefined);
      throw error;
    } catch (error) {
      const appError = error instanceof AppError ? error : new AppError("UPSTREAM", "Unexpected upstream failure", { cause: error });
      if (!appError.retryable || attempt >= retries || options.signal?.aborted) throw appError;
      const delay = backoffDelay(attempt);
      logger.warn("upstream retry", { host: new URL(url).host, attempt, delay, code: appError.code });
      await sleep(delay);
      attempt += 1;
    }
  }
}

export async function fetchJson<T = unknown>(url: string, options: FetchOptions = {}): Promise<T> {
  const res = await fetchResponse(url, options);
  try {
    return (await res.json()) as T;
  } catch (error) {
    throw new AppError("UPSTREAM", `Invalid JSON from ${new URL(url).host}`, { cause: error });
  }
}

export async function fetchText(url: string, options: FetchOptions = {}): Promise<string> {
  const res = await fetchResponse(url, options);
  return res.text();
}
