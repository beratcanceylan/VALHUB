import { AppError } from "@valhub/domain";

interface Entry<T> {
  value: T;
  expiresAt: number;
  /** Stale entries may still be served if a refresh fails. */
  staleUntil: number;
}

export interface CacheOptions {
  ttlMs: number;
  /** How long past expiry a value may be served when the upstream fails. */
  staleIfErrorMs?: number;
}

/**
 * In-memory TTL cache with request coalescing (concurrent callers for the same key share
 * one upstream request) and stale-if-error. Bounded by entry count with LRU eviction.
 */
export class TtlCache {
  private readonly entries = new Map<string, Entry<unknown>>();
  private readonly inflight = new Map<string, Promise<unknown>>();

  constructor(
    private readonly maxEntries = 2000,
    private readonly now: () => number = Date.now,
  ) {}

  get size(): number {
    return this.entries.size;
  }

  peek<T>(key: string): T | undefined {
    const entry = this.entries.get(key) as Entry<T> | undefined;
    if (!entry || entry.expiresAt < this.now()) return undefined;
    return entry.value;
  }

  set<T>(key: string, value: T, options: CacheOptions): void {
    const now = this.now();
    this.entries.delete(key);
    this.entries.set(key, {
      value,
      expiresAt: now + options.ttlMs,
      staleUntil: now + options.ttlMs + (options.staleIfErrorMs ?? 0),
    });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  deletePrefix(prefix: string): void {
    for (const key of this.entries.keys()) if (key.startsWith(prefix)) this.entries.delete(key);
  }

  async getOrLoad<T>(key: string, options: CacheOptions, load: () => Promise<T>): Promise<T> {
    const now = this.now();
    const entry = this.entries.get(key) as Entry<T> | undefined;
    if (entry && entry.expiresAt >= now) {
      // Refresh LRU position.
      this.entries.delete(key);
      this.entries.set(key, entry);
      return entry.value;
    }

    const pending = this.inflight.get(key) as Promise<T> | undefined;
    if (pending) return pending;

    const promise = (async () => {
      try {
        const value = await load();
        this.set(key, value, options);
        return value;
      } catch (error) {
        const stale = this.entries.get(key) as Entry<T> | undefined;
        const retryable = !(error instanceof AppError) || error.retryable || error.code === "RATE_LIMITED";
        if (stale && stale.staleUntil >= this.now() && retryable) return stale.value;
        throw error;
      } finally {
        this.inflight.delete(key);
      }
    })();
    this.inflight.set(key, promise);
    return promise;
  }
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
