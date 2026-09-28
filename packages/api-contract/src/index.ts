import { z } from "zod";
import * as S from "@valhub/schemas";
import { SUPPORTED_LOCALES } from "@valhub/domain";

export const API_VERSION = "1";

/**
 * On-device bootstrap — small operational metadata only. It must never embed game content.
 */
export const bootstrapSchema = z.object({
  apiVersion: z.literal(API_VERSION),
  contentVersion: z.string().optional(),
  locale: z.enum(SUPPORTED_LOCALES),
  capabilities: z.array(S.capabilityStateSchema),
  currentPatch: z.string().optional(),
  allowedMediaHosts: z.array(z.string()),
  attribution: z.object({
    wiki: z.object({ name: z.string(), url: z.string().url(), license: z.string(), licenseUrl: z.string().url() }),
    valorantApi: z.object({ name: z.string(), url: z.string().url() }),
    riotLegal: z.string(),
  }),
});
export type Bootstrap = z.infer<typeof bootstrapSchema>;

export const agentMediaSchema = z.object({
  agentId: z.string(),
  abilities: z.array(
    z.object({
      abilityName: z.string(),
      slot: z.enum(["Q", "E", "C", "X", "PASSIVE"]).optional(),
      description: z.string().optional(),
      videoUrl: z.string().url(),
      mimeType: z.string().optional(),
      thumbnailUrl: z.string().url().optional(),
    }),
  ),
  source: S.sourceRefSchema,
});
export type AgentMedia = z.infer<typeof agentMediaSchema>;

export const responses = {
  bootstrap: bootstrapSchema,
  agents: z.array(S.agentSummarySchema),
  agent: S.agentSchema,
  agentMedia: agentMediaSchema,
  maps: z.array(S.mapSummarySchema),
  map: S.mapSchema,
  weapons: z.array(S.weaponSummarySchema),
  weapon: S.weaponSchema,
  cosmetics: S.pageSchema(S.cosmeticSummarySchema),
  cosmetic: S.cosmeticSchema,
  wiki: S.wikiExcerptSchema,
  news: z.array(S.newsArticleSchema),
  crosshairPresets: z.array(S.crosshairPresetSchema),
  strategies: z.array(S.strategySchema),
  strategy: S.strategySchema,
  search: S.searchResponseSchema,
  me: S.playerProfileSchema,
  myMatches: S.pageSchema(S.matchSummarySchema),
  match: S.matchDetailSchema,
  leaderboard: S.leaderboardSchema,
  acts: z.array(S.actSchema),
  status: S.platformStatusSchema,
  personalStore: S.personalStoreSchema,
  prices: S.priceListSchema,
  currencyIcons: S.currencyIconsSchema,
  capability: S.capabilityStateSchema,
  error: S.appErrorBodySchema,
} as const;

export type ResponseOf<K extends keyof typeof responses> = z.infer<(typeof responses)[K]>;
