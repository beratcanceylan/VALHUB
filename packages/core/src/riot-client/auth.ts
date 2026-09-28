/**
 * Riot Client-style login: the user signs in on Riot's own page (in a WebView) and we read
 * the implicit-grant tokens from the final redirect. No client secret exists or is needed.
 */
export const RIOT_REDIRECT_PREFIX = "https://playvalorant.com/opt_in";

export const RIOT_LOGIN_URL =
  "https://auth.riotgames.com/authorize?redirect_uri=" +
  encodeURIComponent(RIOT_REDIRECT_PREFIX) +
  "&client_id=play-valorant-web-prod&response_type=token%20id_token&nonce=1&scope=account%20openid";

export interface RiotTokens {
  accessToken: string;
  idToken: string;
  /** Epoch ms. */
  expiresAt: number;
}

/** Parses `…/opt_in#access_token=…&id_token=…&expires_in=3600`. URL/URLSearchParams are avoided: RN polyfills are partial. */
export function parseRedirect(url: string, now = Date.now()): RiotTokens | undefined {
  if (!url.startsWith(RIOT_REDIRECT_PREFIX)) return undefined;
  const hash = url.split("#")[1];
  if (!hash) return undefined;
  const params = new Map(
    hash.split("&").map((pair) => {
      const [k = "", v = ""] = pair.split("=");
      return [k, decodeURIComponent(v)] as const;
    }),
  );
  const accessToken = params.get("access_token");
  const idToken = params.get("id_token");
  if (!accessToken || !idToken) return undefined;
  const expiresIn = Number(params.get("expires_in") ?? "3600");
  return { accessToken, idToken, expiresAt: now + (Number.isFinite(expiresIn) ? expiresIn : 3600) * 1000 };
}

/** Tokens within a minute of expiry count as expired so requests never race the deadline. */
export function isExpired(tokens: RiotTokens, now = Date.now()): boolean {
  return now >= tokens.expiresAt - 60_000;
}
