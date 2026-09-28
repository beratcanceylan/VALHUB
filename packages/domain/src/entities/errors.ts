export const APP_ERROR_CODES = [
  "NETWORK",
  "TIMEOUT",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "RATE_LIMITED",
  "UPSTREAM",
  "VALIDATION",
  "CAPABILITY_DISABLED",
] as const;

export type AppErrorCode = (typeof APP_ERROR_CODES)[number];

export interface AppErrorBody {
  code: AppErrorCode;
  message: string;
  /** Seconds, when the upstream supplied Retry-After. */
  retryAfter?: number;
  capability?: string;
}

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly retryAfter?: number;
  readonly capability?: string;

  constructor(code: AppErrorCode, message: string, options?: { retryAfter?: number; capability?: string; cause?: unknown }) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "AppError";
    this.code = code;
    if (options?.retryAfter !== undefined) this.retryAfter = options.retryAfter;
    if (options?.capability !== undefined) this.capability = options.capability;
  }

  toBody(): AppErrorBody {
    const body: AppErrorBody = { code: this.code, message: this.message };
    if (this.retryAfter !== undefined) body.retryAfter = this.retryAfter;
    if (this.capability !== undefined) body.capability = this.capability;
    return body;
  }

  /** Retrying these would be pointless or abusive. */
  get retryable(): boolean {
    return this.code === "NETWORK" || this.code === "TIMEOUT" || this.code === "UPSTREAM";
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

export function httpStatusToErrorCode(status: number): AppErrorCode {
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 408) return "TIMEOUT";
  if (status === 422 || status === 400) return "VALIDATION";
  if (status === 429) return "RATE_LIMITED";
  return "UPSTREAM";
}

export function errorCodeToHttpStatus(code: AppErrorCode): number {
  switch (code) {
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "RATE_LIMITED":
      return 429;
    case "VALIDATION":
      return 400;
    case "TIMEOUT":
      return 504;
    case "CAPABILITY_DISABLED":
      return 503;
    default:
      return 502;
  }
}

/** Parses Retry-After (delta-seconds or HTTP date). Returns seconds or undefined. */
export function parseRetryAfter(header: string | null | undefined, now: number = Date.now()): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);
  const date = Date.parse(header);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, Math.ceil((date - now) / 1000));
}
