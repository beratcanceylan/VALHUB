import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@valhub/domain";
import { TtlCache } from "../src/lib/cache";
import { fetchJson, setFetchImpl } from "../src/lib/http";
import { redactForLog } from "../src/lib/logger";
import { ProviderLimiter } from "../src/lib/rate-limit";

afterEach(() => setFetchImpl((...args) => fetch(...args)));

describe("TtlCache", () => {
  it("coalesces concurrent loads", async () => {
    const cache = new TtlCache();
    const load = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return 42;
    });
    const [a, b] = await Promise.all([cache.getOrLoad("k", { ttlMs: 1000 }, load), cache.getOrLoad("k", { ttlMs: 1000 }, load)]);
    expect(a).toBe(42);
    expect(b).toBe(42);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("serves stale values when a refresh fails with a retryable error", async () => {
    let now = 0;
    const cache = new TtlCache(10, () => now);
    await cache.getOrLoad("k", { ttlMs: 100, staleIfErrorMs: 1000 }, async () => "fresh");
    now = 500;
    const value = await cache.getOrLoad("k", { ttlMs: 100, staleIfErrorMs: 1000 }, async () => {
      throw new AppError("UPSTREAM", "down");
    });
    expect(value).toBe("fresh");
  });

  it("does not mask non-retryable errors with stale data", async () => {
    let now = 0;
    const cache = new TtlCache(10, () => now);
    await cache.getOrLoad("k", { ttlMs: 100, staleIfErrorMs: 1000 }, async () => "fresh");
    now = 500;
    await expect(
      cache.getOrLoad("k", { ttlMs: 100, staleIfErrorMs: 1000 }, async () => {
        throw new AppError("NOT_FOUND", "gone");
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("evicts least recently used entries beyond capacity", () => {
    const cache = new TtlCache(2);
    cache.set("a", 1, { ttlMs: 1000 });
    cache.set("b", 2, { ttlMs: 1000 });
    cache.set("c", 3, { ttlMs: 1000 });
    expect(cache.size).toBe(2);
    expect(cache.peek("a")).toBeUndefined();
  });
});

describe("rate limiting", () => {
  it("provider limiter throws RATE_LIMITED once the bucket is empty", () => {
    const limiter = new ProviderLimiter("p", 2, 0.001);
    limiter.acquire();
    limiter.acquire();
    expect(() => limiter.acquire()).toThrowError(expect.objectContaining({ code: "RATE_LIMITED" }));
  });
});

describe("fetchJson", () => {
  it("does not retry 429 and blocks the provider with Retry-After", async () => {
    const impl = vi.fn(async () => new Response("{}", { status: 429, headers: { "retry-after": "7" } }));
    setFetchImpl(impl as unknown as typeof fetch);
    const limiter = new ProviderLimiter("p", 10, 10);
    await expect(fetchJson("https://example.test/x", { limiter })).rejects.toMatchObject({ code: "RATE_LIMITED", retryAfter: 7 });
    expect(impl).toHaveBeenCalledTimes(1);
    expect(() => limiter.acquire()).toThrowError(expect.objectContaining({ code: "RATE_LIMITED" }));
  });

  it("does not retry 401/403", async () => {
    const impl = vi.fn(async () => new Response("{}", { status: 403 }));
    setFetchImpl(impl as unknown as typeof fetch);
    await expect(fetchJson("https://example.test/x")).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(impl).toHaveBeenCalledTimes(1);
  });

  it("retries 5xx with backoff and then succeeds", async () => {
    let calls = 0;
    setFetchImpl((async () => {
      calls += 1;
      return calls < 2 ? new Response("oops", { status: 503 }) : new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as unknown as typeof fetch);
    await expect(fetchJson("https://example.test/x", { retries: 2 })).resolves.toEqual({ ok: true });
    expect(calls).toBe(2);
  });

  it("maps network failures to NETWORK", async () => {
    setFetchImpl((async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch);
    await expect(fetchJson("https://example.test/x", { retries: 0 })).rejects.toMatchObject({ code: "NETWORK" });
  });
});

describe("log redaction", () => {
  it("redacts secrets and query tokens", () => {
    const out = redactForLog({ authorization: "Bearer x", nested: { apiKey: "k", ok: 1 }, url: "https://h/cb?code=abc&state=def&x=1" }) as Record<string, unknown>;
    expect(out.authorization).toBe("[redacted]");
    expect((out.nested as Record<string, unknown>).apiKey).toBe("[redacted]");
    expect(out.url).toBe("https://h/cb?code=[redacted]&state=[redacted]&x=1");
  });
});
