import type { RiotTokens } from "@valhub/core";

export const encodeTokens = (t: RiotTokens): string => JSON.stringify(t);

/** Reads tokens back from SecureStore; anything malformed counts as signed out. */
export function decodeStoredTokens(raw: string | null): RiotTokens | undefined {
  if (!raw) return undefined;
  try {
    const v = JSON.parse(raw) as Partial<RiotTokens>;
    if (typeof v.accessToken === "string" && typeof v.idToken === "string" && typeof v.expiresAt === "number") {
      return { accessToken: v.accessToken, idToken: v.idToken, expiresAt: v.expiresAt };
    }
  } catch {
    // fall through: corrupt value
  }
  return undefined;
}
