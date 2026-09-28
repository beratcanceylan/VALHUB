import { TtlCache } from "./lib/cache";
import { ValorantApiContentAdapter } from "./adapters/valorant-api/adapter";
import { WikiAdapter } from "./adapters/wiki/adapter";
import { PlayValorantAdapter } from "./adapters/playvalorant/adapter";
import { UnifiedSearch } from "./services/search";
import { listCrosshairPresets } from "./crosshair-presets";
import { RiotClientApi } from "./riot-client/api";

/**
 * On-device public content and session-authenticated Riot account access.
 * Provider DTOs stay inside adapters; callers get domain entities.
 */
export function createCore() {
  const cache = new TtlCache(2000);
  const content = new ValorantApiContentAdapter(cache);
  return {
    cache,
    content,
    wiki: new WikiAdapter(cache),
    playValorant: new PlayValorantAdapter(cache),
    search: new UnifiedSearch(content, () => listCrosshairPresets()),
    crosshairPresets: listCrosshairPresets,
    riot: new RiotClientApi(content, cache),
  };
}

export type Core = ReturnType<typeof createCore>;
export { setFetchImpl } from "./lib/http";
export { officialAgentSlug } from "./adapters/valorant-api/mapper";
export * from "./crosshair-presets";
export { buildBootstrap, localCapabilities, MEDIA_HOSTS } from "./services/local";
export { getAgentMedia } from "./services/agent-media";
export { RiotClientApi, shardFor, type RiotSession, type RiotShard } from "./riot-client/api";
export { isExpired, parseRedirect, RIOT_LOGIN_URL, RIOT_REDIRECT_PREFIX, type RiotTokens } from "./riot-client/auth";
export { getPlatformStatus } from "./status";
