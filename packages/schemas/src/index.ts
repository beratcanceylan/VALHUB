import { z } from "zod";
import type * as D from "@valhub/domain";
import { APP_ERROR_CODES, PROVIDER_CAPABILITIES, SEARCH_KINDS } from "@valhub/domain";

/**
 * Runtime schemas for everything that crosses the core → UI boundary. The mobile
 * client validates every response against these before it reaches UI code.
 */

const url = z.string().url();
const iso = z.string().min(1);

export const sourceRefSchema: z.ZodType<D.SourceRef> = z.object({
  provider: z.enum([
    "riot",
    "playvalorant",
    "valorant-wiki",
    "valorant-api",
    "communitydragon",
    "henrik",
    "internal",
  ]),
  sourceUrl: url.optional(),
  fetchedAt: iso,
  revision: z.string().optional(),
  license: z.string().optional(),
  attribution: z.string().optional(),
});

export const capabilityStateSchema: z.ZodType<D.CapabilityState> = z.object({
  capability: z.enum(PROVIDER_CAPABILITIES),
  available: z.boolean(),
  reason: z.enum(["NOT_CONFIGURED", "POLICY_BLOCKED", "RIGHTS_UNCLEARED", "UPSTREAM_DOWN", "SIGN_IN_REQUIRED"]).optional(),
});

export const appErrorBodySchema: z.ZodType<D.AppErrorBody> = z.object({
  code: z.enum(APP_ERROR_CODES),
  message: z.string(),
  retryAfter: z.number().optional(),
  capability: z.string().optional(),
});

// ---------- content ----------

const agentRole = z.enum(["DUELIST", "INITIATOR", "CONTROLLER", "SENTINEL", "UNKNOWN"]);

export const abilitySchema: z.ZodType<D.Ability> = z.object({
  id: z.string(),
  name: z.string(),
  slot: z.enum(["Q", "E", "C", "X", "PASSIVE"]),
  description: z.string(),
  iconUrl: url.optional(),
  officialVideoUrl: url.optional(),
  officialVideoMimeType: z.string().optional(),
});

export const agentSummarySchema: z.ZodType<D.AgentSummary> = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  role: agentRole,
  iconUrl: url.optional(),
  portraitUrl: url.optional(),
  gradient: z.array(z.string()).optional(),
});

export const agentSchema: z.ZodType<D.Agent> = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  role: agentRole,
  iconUrl: url.optional(),
  portraitUrl: url.optional(),
  gradient: z.array(z.string()).optional(),
  description: z.string(),
  abilities: z.array(abilitySchema),
  source: z.array(sourceRefSchema),
});

export const mapSummarySchema: z.ZodType<D.MapSummary> = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  thumbnailUrl: url.optional(),
  splashUrl: url.optional(),
  isStandard: z.boolean(),
});

export const mapSchema: z.ZodType<D.ValorantMap> = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  thumbnailUrl: url.optional(),
  splashUrl: url.optional(),
  isStandard: z.boolean(),
  overviewImageUrl: url.optional(),
  minimapImageUrl: url.optional(),
  tacticalDescription: z.string().optional(),
  sites: z.array(z.string()),
  callouts: z.array(z.object({ name: z.string(), region: z.string(), x: z.number(), y: z.number() })),
  source: z.array(sourceRefSchema),
});

const weaponCategory = z.enum(["SIDEARM", "SMG", "SHOTGUN", "RIFLE", "SNIPER", "HEAVY", "MELEE", "UNKNOWN"]);

export const weaponSummarySchema: z.ZodType<D.WeaponSummary> = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  category: weaponCategory,
  cost: z.number().optional(),
  iconUrl: url.optional(),
});

export const weaponSchema: z.ZodType<D.Weapon> = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  category: weaponCategory,
  cost: z.number().optional(),
  iconUrl: url.optional(),
  fireRate: z.number().optional(),
  magazineSize: z.number().optional(),
  reloadSeconds: z.number().optional(),
  equipSeconds: z.number().optional(),
  firstBulletAccuracy: z.number().optional(),
  wallPenetration: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  damageRanges: z.array(
    z.object({ startMeters: z.number(), endMeters: z.number(), head: z.number(), body: z.number(), leg: z.number() }),
  ),
  source: z.array(sourceRefSchema),
});

const cosmeticKind = z.enum(["WEAPON_SKIN", "BUNDLE", "BUDDY", "PLAYER_CARD", "SPRAY", "TITLE"]);

export const cosmeticSummarySchema: z.ZodType<D.CosmeticSummary> = z.object({
  id: z.string(),
  kind: cosmeticKind,
  name: z.string(),
  thumbnailUrl: url.optional(),
  weaponId: z.string().optional(),
});

const cosmeticVariant: z.ZodType<D.CosmeticVariant> = z.object({
  id: z.string(),
  name: z.string(),
  imageUrl: url.optional(),
  swatchUrl: url.optional(),
  videoUrl: url.optional(),
  feature: z.enum(["VFX", "ANIMATION", "FINISHER", "SOUND", "KILL_BANNER", "KILL_COUNTER", "INSPECT_KILL", "TOP_FRAGGER", "TRANSFORMATION"]).optional(),
});

export const cosmeticSchema: z.ZodType<D.Cosmetic> = z.object({
  id: z.string(),
  kind: cosmeticKind,
  name: z.string(),
  thumbnailUrl: url.optional(),
  weaponId: z.string().optional(),
  description: z.string().optional(),
  imageUrl: url.optional(),
  tier: z.object({ id: z.string(), name: z.string(), iconUrl: url.optional(), color: z.string().optional() }).optional(),
  chromas: z.array(cosmeticVariant),
  levels: z.array(cosmeticVariant),
  source: z.array(sourceRefSchema),
});

export const wikiExcerptSchema: z.ZodType<D.WikiExcerpt> = z.object({
  title: z.string(),
  extract: z.string(),
  source: sourceRefSchema,
});

export const newsArticleSchema: z.ZodType<D.NewsArticle> = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  url,
  imageUrl: url.optional(),
  publishedAt: iso,
  category: z.string().optional(),
  source: sourceRefSchema,
});

// ---------- player ----------

const riotRegion = z.enum(["ap", "br", "eu", "kr", "latam", "na"]);

const rankSchema: z.ZodType<D.CompetitiveRank> = z.object({
  tierId: z.number(),
  name: z.string(),
  rr: z.number().optional(),
  actId: z.string().optional(),
});

export const playerProfileSchema: z.ZodType<D.PlayerProfile> = z.object({
  puuid: z.string(),
  gameName: z.string(),
  tagLine: z.string(),
  region: riotRegion,
  rank: rankSchema.optional(),
  peakRank: rankSchema.optional(),
});

const matchSummaryShape = {
  id: z.string(),
  startedAt: iso,
  mapId: z.string(),
  queue: z.string(),
  agentId: z.string().optional(),
  won: z.boolean().optional(),
  roundsWon: z.number(),
  roundsLost: z.number(),
  kills: z.number().optional(),
  deaths: z.number().optional(),
  assists: z.number().optional(),
  score: z.number().optional(),
};

export const matchSummarySchema: z.ZodType<D.MatchSummary> = z.object(matchSummaryShape);

export const matchDetailSchema: z.ZodType<D.MatchDetail> = z.object({
  ...matchSummaryShape,
  lengthMs: z.number().optional(),
  teams: z.array(z.object({ teamId: z.string(), won: z.boolean(), roundsWon: z.number() })),
  players: z.array(
    z.object({
      puuid: z.string(),
      gameName: z.string(),
      tagLine: z.string(),
      teamId: z.string(),
      agentId: z.string(),
      kills: z.number(),
      deaths: z.number(),
      assists: z.number(),
      score: z.number(),
      roundsPlayed: z.number(),
      headshots: z.number().optional(),
      bodyshots: z.number().optional(),
      legshots: z.number().optional(),
      damageDealt: z.number().optional(),
      competitiveTier: z.number().optional(),
    }),
  ),
  rounds: z.array(
    z.object({
      number: z.number(),
      winningTeam: z.string(),
      result: z.string(),
      plantedBy: z.string().optional(),
      defusedBy: z.string().optional(),
      plantSite: z.string().optional(),
    }),
  ),
});

export const leaderboardSchema: z.ZodType<D.Leaderboard> = z.object({
  actId: z.string(),
  region: riotRegion,
  totalPlayers: z.number(),
  entries: z.array(
    z.object({
      rank: z.number(),
      gameName: z.string().optional(),
      tagLine: z.string().optional(),
      rankedRating: z.number(),
      wins: z.number(),
      competitiveTier: z.number().optional(),
    }),
  ),
});

const incidentSchema: z.ZodType<D.PlatformIncident> = z.object({
  id: z.string(),
  title: z.string(),
  severity: z.string(),
  createdAt: iso,
  updatedAt: iso.optional(),
  message: z.string().optional(),
});

export const platformStatusSchema: z.ZodType<D.PlatformStatus> = z.object({
  region: riotRegion,
  maintenances: z.array(incidentSchema),
  incidents: z.array(incidentSchema),
});

const currency = z.enum(["VP", "KC", "RP"]);
const cost = z.number().int().nonnegative();

export const itemPriceSchema: z.ZodType<D.ItemPrice> = z.object({ cost, currency });

const storeOfferSchema: z.ZodType<D.StoreOffer> = z.object({
  id: z.string().min(1),
  kind: cosmeticKind.optional(),
  cosmeticId: z.string().optional(),
  name: z.string().optional(),
  imageUrl: url.optional(),
  cost,
  currency,
  originalCost: cost.optional(),
  discountPercent: z.number().min(0).max(100).optional(),
});

const storeBundleSchema: z.ZodType<D.StoreBundle> = z.object({
  id: z.string().min(1),
  cosmeticId: z.string().optional(),
  name: z.string().optional(),
  imageUrl: url.optional(),
  cost,
  currency,
  originalCost: cost.optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  endsAt: iso,
  items: z.array(storeOfferSchema),
});

export const personalStoreSchema: z.ZodType<D.PersonalStore> = z.object({
  daily: z.array(storeOfferSchema),
  dailyRefreshAt: iso,
  bundles: z.array(storeBundleSchema),
  accessories: z.object({ offers: z.array(storeOfferSchema), refreshAt: iso }).optional(),
  nightMarket: z.object({ offers: z.array(storeOfferSchema), endsAt: iso }).optional(),
  walletVp: cost.optional(),
  walletKc: cost.optional(),
});

export const currencyIconsSchema: z.ZodType<D.CurrencyIcons> = z.object({ VP: url.optional(), KC: url.optional(), RP: url.optional() });

export const priceListSchema: z.ZodType<D.PriceList> = z.record(z.string(), itemPriceSchema);

export const actSchema: z.ZodType<D.Act> = z.object({
  id: z.string(),
  name: z.string(),
  isActive: z.boolean(),
  parentId: z.string().optional(),
  type: z.enum(["act", "episode"]),
});

// ---------- library ----------

const point: z.ZodType<D.NormalizedMapPoint> = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  label: z.string().max(60).optional(),
});

const strategySide = z.enum(["ATTACK", "DEFENSE", "BOTH"]);

export const crosshairSummarySchema: z.ZodType<D.CrosshairSummary> = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  tags: z.array(z.string()),
});

/** Editorial presets carry the code; the app parses it into normalized settings. */
export const crosshairPresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  tags: z.array(z.string()),
  attribution: z.string().optional(),
});
export type CrosshairPreset = z.infer<typeof crosshairPresetSchema>;

const strategyColor = z.enum(["ACCENT", "ALLY", "ENEMY", "NEUTRAL"]);
const coord = z.number().min(0).max(1);

export const strategyElementSchema: z.ZodType<D.StrategyElement> = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("AGENT"), id: z.string(), agentId: z.string(), x: coord, y: coord, team: z.enum(["ALLY", "ENEMY"]) }),
  z.object({ kind: z.literal("ABILITY"), id: z.string(), agentId: z.string(), abilityId: z.string(), x: coord, y: coord }),
  z.object({ kind: z.literal("ARROW"), id: z.string(), from: point, to: point, color: strategyColor }),
  z.object({ kind: z.literal("PATH"), id: z.string(), points: z.array(point).max(200), color: strategyColor }),
  z.object({ kind: z.literal("AREA"), id: z.string(), points: z.array(point).max(200), color: strategyColor }),
  z.object({ kind: z.literal("LABEL"), id: z.string(), x: coord, y: coord, text: z.string().max(80) }),
]);

export const strategySchema: z.ZodType<D.Strategy> = z.object({
  id: z.string(),
  mapId: z.string(),
  title: z.string().max(120),
  side: strategySide.optional(),
  version: z.number().int().min(1),
  frames: z
    .array(z.object({ id: z.string(), title: z.string().max(60).optional(), elements: z.array(strategyElementSchema).max(300) }))
    .min(1)
    .max(30),
  updatedAt: iso,
});

// ---------- search ----------

const searchResult: z.ZodType<D.SearchResult> = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("agent"), item: agentSummarySchema }),
  z.object({ kind: z.literal("map"), item: mapSummarySchema }),
  z.object({ kind: z.literal("weapon"), item: weaponSummarySchema }),
  z.object({ kind: z.literal("cosmetic"), item: cosmeticSummarySchema }),
  z.object({ kind: z.literal("crosshair"), item: crosshairSummarySchema }),
]);

export const searchResponseSchema: z.ZodType<D.SearchResponse> = z.object({
  query: z.string(),
  groups: z.array(z.object({ kind: z.enum(SEARCH_KINDS as [D.SearchKind, ...D.SearchKind[]]), results: z.array(searchResult) })),
  degraded: z.array(z.string()),
});

export function pageSchema<T>(item: z.ZodType<T>): z.ZodType<D.Page<T>> {
  return z.object({ items: z.array(item), nextCursor: z.string().optional(), total: z.number().optional() });
}

export { z };
