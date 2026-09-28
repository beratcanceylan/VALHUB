import {
  AppError,
  RIOT_REGIONS,
  type AppLocale,
  type Leaderboard,
  type MatchDetail,
  type MatchSummary,
  type Page,
  type PersonalStore,
  type PlayerProfile,
  type PriceList,
  type RiotRegion,
} from "@valhub/domain";
import type { ContentAdapter } from "../adapters/types";
import { HOUR, MINUTE, type TtlCache } from "../lib/cache";
import { fetchJson, type FetchOptions } from "../lib/http";
import type { RiotTokens } from "./auth";
import { summarizeFor, toMatchDetail, type DtoMatch } from "./match";
import { KC, toPersonalStore, toPriceList, VP, type CatalogIndex, type DtoOffers, type DtoStorefront } from "./store";

export type RiotShard = "na" | "eu" | "ap" | "kr";

export interface RiotSession {
  tokens: RiotTokens;
  entitlements: string;
  puuid: string;
  gameName: string;
  tagLine: string;
  region: RiotRegion;
  shard: RiotShard;
}

// Base64 of the PC client platform JSON every pd/shared endpoint expects.
const CLIENT_PLATFORM =
  "ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIldpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9";

/** Riot's live affinity → region + the pd shard that serves it (LATAM/BR live on NA). */
export function shardFor(region: string): { region: RiotRegion; shard: RiotShard } {
  if (!(RIOT_REGIONS as readonly string[]).includes(region)) throw new AppError("UPSTREAM", `Unsupported Riot region: ${region}`);
  const r = region as RiotRegion;
  return { region: r, shard: r === "latam" || r === "br" ? "na" : (r as RiotShard) };
}

// ---- client API DTOs (private to this module) ----

interface DtoMmr {
  LatestCompetitiveUpdate?: { TierAfterUpdate?: number; RankedRatingAfterUpdate?: number; SeasonID?: string };
}

interface DtoHistory {
  History: Array<{ MatchID: string }>;
  Total: number;
}

interface DtoContent {
  Seasons: Array<{ ID: string; Type: string; IsActive: boolean }>;
}

interface DtoLeaderboard {
  totalPlayers?: number;
  Players?: Array<{ gameName?: string; tagLine?: string; leaderboardRank: number; rankedRating: number; numberOfWins: number; competitiveTier?: number }>;
}

/**
 * The game client's own (unofficial) endpoints, reached with the signed-in user's tokens.
 * Riot can change these with any patch; failures surface as typed AppErrors (UPSTREAM/UNAUTHORIZED).
 */
export class RiotClientApi {
  constructor(
    private readonly content: ContentAdapter,
    private readonly cache: TtlCache,
  ) {}

  private clientVersion(): Promise<string> {
    return this.cache.getOrLoad("riot:clientVersion", { ttlMs: HOUR, staleIfErrorMs: 24 * HOUR }, async () => {
      const body = await fetchJson<{ data: { riotClientVersion: string } }>("https://valorant-api.com/v1/version");
      return body.data.riotClientVersion;
    });
  }

  private async clientHeaders(s: RiotSession | undefined): Promise<Record<string, string>> {
    return {
      "x-riot-clientversion": await this.clientVersion(),
      "x-riot-clientplatform": CLIENT_PLATFORM,
      ...(s ? { authorization: `Bearer ${s.tokens.accessToken}`, "x-riot-entitlements-jwt": s.entitlements } : {}),
    };
  }

  /** GET/POST against `pd.<shard>.a.pvp.net`. */
  async pd<T>(s: RiotSession, path: string, init: Pick<FetchOptions, "method" | "body" | "timeoutMs"> & { shard?: RiotShard } = {}): Promise<T> {
    const { shard = s.shard, ...rest } = init;
    const headers = await this.clientHeaders(s);
    if (rest.body !== undefined) headers["content-type"] = "application/json";
    return fetchJson<T>(`https://pd.${shard}.a.pvp.net${path}`, { ...rest, headers, retries: 1 });
  }

  /** Turns fresh login tokens into a usable session (entitlements, identity, region). */
  async establish(tokens: RiotTokens): Promise<RiotSession> {
    const auth = { authorization: `Bearer ${tokens.accessToken}` };
    const [ent, info, geo] = await Promise.all([
      fetchJson<{ entitlements_token: string }>("https://entitlements.auth.riotgames.com/api/token/v1", {
        method: "POST",
        headers: { ...auth, "content-type": "application/json" },
        body: "{}",
      }),
      fetchJson<{ sub: string; acct?: { game_name?: string; tag_line?: string } }>("https://auth.riotgames.com/userinfo", { headers: auth }),
      fetchJson<{ affinities: { live: string } }>("https://riot-geo.pas.si.riotgames.com/pas/v1/product/valorant", {
        method: "PUT",
        headers: { ...auth, "content-type": "application/json" },
        body: JSON.stringify({ id_token: tokens.idToken }),
      }),
    ]);
    return {
      tokens,
      entitlements: ent.entitlements_token,
      puuid: info.sub,
      gameName: info.acct?.game_name ?? "",
      tagLine: info.acct?.tag_line ?? "",
      ...shardFor(geo.affinities.live),
    };
  }

  async profile(s: RiotSession, locale: AppLocale): Promise<PlayerProfile> {
    const profile: PlayerProfile = { puuid: s.puuid, gameName: s.gameName, tagLine: s.tagLine, region: s.region };
    const mmr = await this.pd<DtoMmr>(s, `/mmr/v1/players/${s.puuid}`).catch(() => undefined);
    const latest = mmr?.LatestCompetitiveUpdate;
    const tier = latest?.TierAfterUpdate;
    if (tier !== undefined && tier > 0) {
      const name = await this.content.getTierName(tier, locale).catch(() => undefined);
      profile.rank = {
        tierId: tier,
        name: name ?? `Tier ${tier}`,
        ...(latest?.RankedRatingAfterUpdate !== undefined ? { rr: latest.RankedRatingAfterUpdate } : {}),
      };
    }
    return profile;
  }

  async match(s: RiotSession, id: string): Promise<MatchDetail> {
    // Completed matches are immutable: cache long.
    return this.cache.getOrLoad(`riot:match:${id}`, { ttlMs: 24 * HOUR }, async () => {
      const dto = await this.pd<DtoMatch>(s, `/match-details/v1/matches/${encodeURIComponent(id)}`);
      const mapId = (await this.content.resolveMapAssetPath(dto.matchInfo.mapId).catch(() => undefined)) ?? dto.matchInfo.mapId;
      return toMatchDetail(dto, mapId);
    });
  }

  async matches(s: RiotSession, cursor: string | undefined, limit: number): Promise<Page<MatchSummary>> {
    const start = Math.max(0, Number(cursor ?? 0) || 0);
    const body = await this.pd<DtoHistory>(s, `/match-history/v1/history/${s.puuid}?startIndex=${start}&endIndex=${start + limit}`);
    const items: MatchSummary[] = [];
    // Small batches: the pd service rate-limits bursts.
    for (let i = 0; i < body.History.length; i += 4) {
      const chunk = await Promise.all(body.History.slice(i, i + 4).map((h) => this.match(s, h.MatchID)));
      items.push(...chunk.map((d) => summarizeFor(d, s.puuid)));
    }
    const next = start + body.History.length;
    return { items, ...(body.History.length > 0 && next < body.Total ? { nextCursor: String(next) } : {}) };
  }

  /** Today's offers, featured collection, accessories, night market (when running) and wallet. */
  async storefront(s: RiotSession, locale: AppLocale): Promise<PersonalStore> {
    const [dto, wallet, catalog] = await Promise.all([
      this.pd<DtoStorefront>(s, `/store/v3/storefront/${s.puuid}`, { method: "POST", body: "{}" }),
      this.pd<{ Balances: Record<string, number> }>(s, `/store/v1/wallet/${s.puuid}`).catch(() => undefined),
      this.content.getCatalogIndex(locale).catch(() => new Map() as CatalogIndex),
    ]);
    const store = toPersonalStore(dto, catalog, Date.now());
    const vp = wallet?.Balances[VP];
    if (vp !== undefined) store.walletVp = vp;
    const kc = wallet?.Balances[KC];
    if (kc !== undefined) store.walletKc = kc;
    return store;
  }

  /** Catalogue prices (skins in VP, upgrades in Radianite when Riot lists them). */
  async prices(s: RiotSession): Promise<PriceList> {
    return this.cache.getOrLoad(`riot:offers:${s.shard}`, { ttlMs: 6 * HOUR, staleIfErrorMs: 48 * HOUR }, async () =>
      toPriceList(await this.pd<DtoOffers>(s, "/store/v1/offers/")),
    );
  }

  /**
   * The running act. The content service now wants the player's tokens; when it still
   * refuses, valorant-api's season calendar gives the same id from today's date.
   */
  private activeActId(s: RiotSession, shard: RiotShard): Promise<string> {
    return this.cache.getOrLoad(`riot:act:${shard}`, { ttlMs: HOUR, staleIfErrorMs: 24 * HOUR }, async () => {
      const content = await fetchJson<DtoContent>(`https://shared.${shard}.a.pvp.net/content-service/v3/content`, {
        headers: await this.clientHeaders(s),
        retries: 1,
      }).catch(() => undefined);
      const act = content?.Seasons?.find((x) => x.Type === "act" && x.IsActive);
      if (act) return act.ID;
      const fallback = await Promise.resolve()
        .then(() => this.content.getCurrentActId(Date.now()))
        .catch(() => undefined);
      if (!fallback) throw new AppError("UPSTREAM", "No active act");
      return fallback;
    });
  }

  /** Ranked leaderboard for `region` (defaults to the player's own), served by that region's shard. */
  async leaderboard(s: RiotSession, start: number, size: number, region: RiotRegion = s.region): Promise<Leaderboard> {
    const safeSize = Math.min(Math.max(size, 1), 200);
    const { shard } = shardFor(region);
    return this.cache.getOrLoad(`riot:lb:${region}:${start}:${safeSize}`, { ttlMs: 2 * MINUTE, staleIfErrorMs: HOUR }, async () => {
      const actId = await this.activeActId(s, shard);
      const body = await this.pd<DtoLeaderboard>(
        s,
        `/mmr/v1/leaderboards/affinity/${region}/queue/competitive/season/${actId}?startIndex=${Math.max(0, start)}&size=${safeSize}`,
        { shard, timeoutMs: 15_000 },
      );
      return {
        actId,
        region,
        totalPlayers: body.totalPlayers ?? 0,
        // PUUIDs are intentionally dropped; anonymous players keep their rank without a name.
        entries: (body.Players ?? []).map((p) => ({
          rank: p.leaderboardRank,
          rankedRating: p.rankedRating,
          wins: p.numberOfWins,
          ...(p.gameName ? { gameName: p.gameName } : {}),
          ...(p.tagLine ? { tagLine: p.tagLine } : {}),
          ...(typeof p.competitiveTier === "number" ? { competitiveTier: p.competitiveTier } : {}),
        })),
      };
    });
  }
}
