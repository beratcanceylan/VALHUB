import { afterEach, describe, expect, it } from "vitest";
import { riotMatch } from "@valhub/test-fixtures";
import * as S from "@valhub/schemas";
import type { ContentAdapter } from "../src/adapters/types";
import { TtlCache } from "../src/lib/cache";
import { setFetchImpl } from "../src/lib/http";
import { isExpired, parseRedirect, RIOT_LOGIN_URL } from "../src/riot-client/auth";
import { RiotClientApi, shardFor, type RiotSession } from "../src/riot-client/api";
import { summarizeFor, toMatchDetail } from "../src/riot-client/match";
import { getPlatformStatus } from "../src/status";

describe("parseRedirect", () => {
  it("reads tokens from the redirect fragment", () => {
    const t = parseRedirect("https://playvalorant.com/opt_in#access_token=AT&scope=account&id_token=IT&token_type=Bearer&expires_in=3600", 1_000);
    expect(t).toEqual({ accessToken: "AT", idToken: "IT", expiresAt: 1_000 + 3_600_000 });
  });
  it("ignores other URLs and error redirects", () => {
    expect(parseRedirect("https://auth.riotgames.com/login")).toBeUndefined();
    expect(parseRedirect("https://playvalorant.com/opt_in#error=access_denied")).toBeUndefined();
    expect(parseRedirect("https://playvalorant.com/opt_in")).toBeUndefined();
  });
  it("treats tokens within 60 s of expiry as expired", () => {
    expect(isExpired({ accessToken: "a", idToken: "i", expiresAt: 100_000 }, 40_001)).toBe(true);
    expect(isExpired({ accessToken: "a", idToken: "i", expiresAt: 100_000 }, 39_999)).toBe(false);
  });
  it("logs in with the public web client", () => {
    expect(RIOT_LOGIN_URL).toContain("client_id=play-valorant-web-prod");
    expect(RIOT_LOGIN_URL).toContain("response_type=token%20id_token");
  });
});

describe("shardFor", () => {
  it("maps latam/br onto the na shard", () => {
    expect(shardFor("latam")).toEqual({ region: "latam", shard: "na" });
    expect(shardFor("br")).toEqual({ region: "br", shard: "na" });
    expect(shardFor("eu")).toEqual({ region: "eu", shard: "eu" });
  });
  it("rejects unknown affinities with UPSTREAM", () => {
    expect(() => shardFor("pbe")).toThrow(expect.objectContaining({ code: "UPSTREAM" }));
  });
});

describe("match mapping", () => {
  it("maps client-API payloads that spell queueID", () => {
    const dto = riotMatch() as unknown as { matchInfo: Record<string, unknown> };
    const queue = dto.matchInfo.queueId;
    dto.matchInfo.queueID = queue;
    delete dto.matchInfo.queueId;
    const detail = toMatchDetail(dto as never, "ascent");
    expect(detail.queue).toBe(queue);
    expect(S.matchDetailSchema.parse(detail)).toBeTruthy();
    expect(detail.players).toHaveLength(2);
  });
  it("reads pd `subject` ids so the full scoreboard passes the contract", () => {
    const detail = toMatchDetail(riotMatch() as never, "ascent");
    expect(detail.players.map((p) => p.puuid)).toEqual(["puuid-me", "puuid-other"]);
    expect(detail.players[0]).toMatchObject({ damageDealt: 250, headshots: 1 });
    expect(S.matchDetailSchema.safeParse(detail).success).toBe(true);
  });
  it("still accepts the official `puuid` spelling and tolerates null counters", () => {
    const dto = riotMatch() as unknown as { players: Array<Record<string, unknown>>; roundResults: Array<{ playerStats: unknown }> };
    for (const p of dto.players) {
      p.puuid = p.subject;
      delete p.subject;
    }
    (dto.players[1] as { stats: Record<string, unknown> }).stats.assists = null;
    dto.roundResults[1]!.playerStats = null;
    const detail = toMatchDetail(dto as never, "ascent");
    expect(detail.players[1]?.assists).toBe(0);
    expect(S.matchDetailSchema.safeParse(detail).success).toBe(true);
  });
  it("summarizes a match from the signed-in player's side", () => {
    const detail = toMatchDetail(riotMatch() as never, "ascent");
    const summary = summarizeFor(detail, "puuid-me");
    expect(S.matchSummarySchema.parse(summary)).toBeTruthy();
    expect(summary.kills).toBeDefined();
  });
});

// ---------- request flow against a stubbed network ----------

type Route = (url: string, init: RequestInit) => unknown;
function stub(routes: Array<[RegExp, Route]>) {
  const seen: Array<{ url: string; init: RequestInit }> = [];
  setFetchImpl(async (input, init = {}) => {
    const url = String(input);
    seen.push({ url, init });
    const route = routes.find(([re]) => re.test(url));
    if (!route) return new Response("not found", { status: 404 });
    return new Response(JSON.stringify(route[1](url, init)), { status: 200, headers: { "content-type": "application/json" } });
  });
  return seen;
}
afterEach(() => setFetchImpl((...args) => fetch(...args)));

const content = {
  resolveMapAssetPath: async () => "ascent",
  getCurrentActId: async () => "act-from-calendar",
  getTierName: async (tier: number) => (tier === 21 ? "Immortal 1" : undefined),
} as unknown as ContentAdapter;

const tokens = { accessToken: "AT", idToken: "IT", expiresAt: Date.now() + 3_600_000 };
const session: RiotSession = { tokens, entitlements: "ENT", puuid: "puuid-me", gameName: "Sova", tagLine: "EUW", region: "eu", shard: "eu" };

describe("RiotClientApi", () => {
  it("establishes a session from tokens: entitlements, identity and region", async () => {
    const seen = stub([
      [/entitlements\.auth/, () => ({ entitlements_token: "ENT" })],
      [/auth\.riotgames\.com\/userinfo/, () => ({ sub: "puuid-me", acct: { game_name: "Sova", tag_line: "EUW" } })],
      [/riot-geo/, () => ({ affinities: { live: "eu" } })],
    ]);
    const s = await new RiotClientApi(content, new TtlCache(10)).establish(tokens);
    expect(s).toMatchObject({ entitlements: "ENT", puuid: "puuid-me", gameName: "Sova", tagLine: "EUW", region: "eu", shard: "eu" });
    expect(seen.every((r) => (r.init.headers as Record<string, string>).authorization === "Bearer AT")).toBe(true);
  });

  it("sends client headers to pd endpoints and maps rank", async () => {
    const seen = stub([
      [/valorant-api\.com\/v1\/version/, () => ({ data: { riotClientVersion: "release-99.0-shipping-1-123" } })],
      [/pd\.eu\.a\.pvp\.net\/mmr\/v1\/players\/puuid-me$/, () => ({ LatestCompetitiveUpdate: { TierAfterUpdate: 21, RankedRatingAfterUpdate: 42 } })],
    ]);
    const profile = await new RiotClientApi(content, new TtlCache(10)).profile(session, "en");
    expect(profile.rank).toEqual({ tierId: 21, name: "Immortal 1", rr: 42 });
    expect(S.playerProfileSchema.parse(profile)).toBeTruthy();
    const pd = seen.find((r) => r.url.includes("pd.eu"));
    const h = pd?.init.headers as Record<string, string>;
    expect(h["x-riot-entitlements-jwt"]).toBe("ENT");
    expect(h["x-riot-clientversion"]).toBe("release-99.0-shipping-1-123");
    expect(h["x-riot-clientplatform"]).toBeTruthy();
  });

  it("pages match history with a numeric cursor", async () => {
    const dto = riotMatch() as unknown as { matchInfo: { matchId: string } };
    stub([
      [/valorant-api\.com\/v1\/version/, () => ({ data: { riotClientVersion: "v" } })],
      [/match-history/, () => ({ History: [{ MatchID: dto.matchInfo.matchId }], Total: 3 })],
      [/match-details/, () => riotMatch()],
    ]);
    const page = await new RiotClientApi(content, new TtlCache(10)).matches(session, undefined, 1);
    expect(page.items).toHaveLength(1);
    expect(page.nextCursor).toBe("1");
    expect(S.pageSchema(S.matchSummarySchema).parse(page)).toBeTruthy();
  });

  it("maps the regional leaderboard for the active act", async () => {
    stub([
      [/valorant-api\.com\/v1\/version/, () => ({ data: { riotClientVersion: "v" } })],
      [/shared\.eu\.a\.pvp\.net\/content-service/, () => ({ Seasons: [{ ID: "old", Type: "act", IsActive: false }, { ID: "act-now", Type: "act", IsActive: true }] })],
      [/leaderboards/, () => ({ totalPlayers: 2, Players: [{ puuid: "x", gameName: "", tagLine: "", leaderboardRank: 1, rankedRating: 900, numberOfWins: 120, competitiveTier: 27 }] })],
    ]);
    const lb = await new RiotClientApi(content, new TtlCache(10)).leaderboard(session, 0, 50);
    expect(lb.actId).toBe("act-now");
    expect(lb.entries[0]).toEqual({ rank: 1, rankedRating: 900, wins: 120, competitiveTier: 27 });
    expect(S.leaderboardSchema.parse(lb)).toBeTruthy();
  });

  it("asks the content service with the player's tokens", async () => {
    const seen = stub([
      [/valorant-api\.com\/v1\/version/, () => ({ data: { riotClientVersion: "v" } })],
      [/shared\.eu\.a\.pvp\.net\/content-service/, () => ({ Seasons: [{ ID: "act-now", Type: "act", IsActive: true }] })],
      [/leaderboards/, () => ({ totalPlayers: 0, Players: [] })],
    ]);
    await new RiotClientApi(content, new TtlCache(10)).leaderboard(session, 0, 50);
    const h = seen.find((r) => r.url.includes("content-service"))?.init.headers as Record<string, string>;
    expect(h.authorization).toBe("Bearer AT");
    expect(h["x-riot-entitlements-jwt"]).toBe("ENT");
  });

  it("falls back to the season calendar when the content service refuses", async () => {
    const seen = stub([
      [/valorant-api\.com\/v1\/version/, () => ({ data: { riotClientVersion: "v" } })],
      [/leaderboards/, () => ({ totalPlayers: 1, Players: [] })],
    ]);
    const lb = await new RiotClientApi(content, new TtlCache(10)).leaderboard(session, 0, 50);
    expect(lb.actId).toBe("act-from-calendar");
    expect(seen.some((r) => r.url.includes("/season/act-from-calendar?"))).toBe(true);
  });

  it("reads another region's leaderboard from that region's shard", async () => {
    const seen = stub([
      [/valorant-api\.com\/v1\/version/, () => ({ data: { riotClientVersion: "v" } })],
      [/shared\.na\.a\.pvp\.net\/content-service/, () => ({ Seasons: [{ ID: "act-now", Type: "act", IsActive: true }] })],
      [/pd\.na\.a\.pvp\.net\/mmr\/v1\/leaderboards\/affinity\/latam\//, () => ({ totalPlayers: 0, Players: [] })],
    ]);
    const lb = await new RiotClientApi(content, new TtlCache(10)).leaderboard(session, 0, 50, "latam");
    expect(lb.region).toBe("latam");
    expect(seen.some((r) => r.url.includes("pd.na.a.pvp.net/mmr/v1/leaderboards/affinity/latam/"))).toBe(true);
  });
});

describe("getPlatformStatus", () => {
  it("reads the public status feed without a key", async () => {
    const seen = stub([
      [
        /riotcdn\.net.*\/eu\.json/,
        () => ({
          maintenances: [],
          incidents: [
            { id: 7, incident_severity: "warning", titles: [{ locale: "en_US", content: "Login issues" }], updates: [], created_at: "2026-09-26T10:00:00Z", updated_at: null },
          ],
        }),
      ],
    ]);
    const status = await getPlatformStatus("eu", "en", new TtlCache(10));
    expect(status.incidents[0]).toMatchObject({ id: "7", title: "Login issues", severity: "warning" });
    expect(seen[0]?.url).toContain("eu.json");
    expect(S.platformStatusSchema.parse(status)).toBeTruthy();
  });
});
