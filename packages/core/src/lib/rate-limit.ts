import { AppError } from "@valhub/domain";

/**
 * Token bucket. Used per upstream provider for outbound requests.
 */
export class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
    private readonly now: () => number = Date.now,
  ) {
    this.tokens = capacity;
    this.lastRefill = now();
  }

  private refill(): void {
    const now = this.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerSecond);
    this.lastRefill = now;
  }

  tryTake(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  /** Seconds until one token is available. */
  waitSeconds(): number {
    this.refill();
    return this.tokens >= 1 ? 0 : Math.ceil((1 - this.tokens) / this.refillPerSecond);
  }
}

/** Outbound limiter that throws RATE_LIMITED rather than queueing unboundedly. */
export class ProviderLimiter {
  private readonly bucket: TokenBucket;
  private blockedUntil = 0;

  constructor(
    readonly provider: string,
    capacity: number,
    refillPerSecond: number,
    private readonly now: () => number = Date.now,
  ) {
    this.bucket = new TokenBucket(capacity, refillPerSecond, now);
  }

  /** Called when the upstream answered 429 so we stop sending until Retry-After passes. */
  block(seconds: number): void {
    this.blockedUntil = Math.max(this.blockedUntil, this.now() + seconds * 1000);
  }

  acquire(): void {
    const now = this.now();
    if (now < this.blockedUntil) {
      throw new AppError("RATE_LIMITED", `${this.provider} is rate limited`, {
        retryAfter: Math.ceil((this.blockedUntil - now) / 1000),
      });
    }
    if (!this.bucket.tryTake()) {
      throw new AppError("RATE_LIMITED", `${this.provider} local rate limit reached`, {
        retryAfter: this.bucket.waitSeconds(),
      });
    }
  }
}
