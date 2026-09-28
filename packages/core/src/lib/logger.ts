const REDACT_KEYS = /token|secret|authorization|api[-_]?key|password|cookie|code_verifier|refresh|puuid/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[depth]";
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = REDACT_KEYS.test(k) ? "[redacted]" : redact(v, depth + 1);
    }
    return out;
  }
  if (typeof value === "string") {
    // Strip query-string secrets from logged URLs.
    return value.replace(/([?&](?:api_key|token|code|state)=)[^&\s]+/gi, "$1[redacted]");
  }
  return value;
}

type Level = "debug" | "info" | "warn" | "error";

// On device only warnings and errors surface; debug/info would just flood the Metro log.
function write(level: Level, msg: string, fields?: Record<string, unknown>): void {
  if (level === "debug" || level === "info") return;
  const payload = redact(fields ?? {});
  if (level === "error") console.error(`[core] ${msg}`, payload);
  else console.warn(`[core] ${msg}`, payload);
}

export const logger = {
  debug: (msg: string, fields?: Record<string, unknown>) => write("debug", msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) => write("info", msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => write("warn", msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => write("error", msg, fields),
};

export { redact as redactForLog };
