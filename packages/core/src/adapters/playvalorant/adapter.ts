import { fnv1a } from "../../lib/hash";
import { AppError, type AppLocale, type CapabilityState, type NewsArticle } from "@valhub/domain";
import { HOUR, MINUTE, TtlCache } from "../../lib/cache";
import { fetchText } from "../../lib/http";
import { ProviderLimiter } from "../../lib/rate-limit";
import type { AgentAbilityMedia, NewsAdapter, OfficialAgentMediaAdapter } from "../types";
import { extractNextData, parseAgentAbilityVideos, parseArticleCards } from "./next-data";

const PLAYVALORANT_ORIGIN = "https://playvalorant.com";

const SITE_LOCALE: Record<AppLocale, string> = {
  en: "en-us",
  tr: "tr-tr",
  de: "de-de",
  fr: "fr-fr",
  es: "es-es",
  "es-MX": "es-mx",
  it: "it-it",
  pl: "pl-pl",
  "pt-BR": "pt-br",
  ru: "ru-ru",
  ar: "ar-ae",
  id: "id-id",
  th: "th-th",
  vi: "vi-vn",
  ja: "ja-jp",
  ko: "ko-kr",
  // playvalorant.com has no Simplified Chinese edition.
  "zh-Hans": "zh-tw",
  "zh-Hant": "zh-tw",
};

/**
 * Official PlayValorant pages: agent ability demonstration videos and news/patch notes.
 * Only remote URL references leave this adapter; videos are streamed by the client and
 * never downloaded, rehosted or cached as media.
 */
export class PlayValorantAdapter implements OfficialAgentMediaAdapter, NewsAdapter {
  private readonly limiter = new ProviderLimiter("playvalorant", 10, 1);
  private lastFailureAt = 0;

  constructor(private readonly cache: TtlCache) {}

  capabilities(): CapabilityState[] {
    const down = Date.now() - this.lastFailureAt < 60_000;
    const state = (capability: "AGENT_VIDEOS" | "NEWS"): CapabilityState =>
      down ? { capability, available: false, reason: "UPSTREAM_DOWN" } : { capability, available: true };
    return [state("AGENT_VIDEOS"), state("NEWS")];
  }

  private async page(path: string): Promise<unknown> {
    try {
      const html = await fetchText(`${PLAYVALORANT_ORIGIN}${path}`, {
        limiter: this.limiter,
        timeoutMs: 12_000,
        headers: { accept: "text/html" },
      });
      const data = extractNextData(html);
      if (!data) throw new AppError("UPSTREAM", "Official page structure not recognised");
      return data;
    } catch (error) {
      this.lastFailureAt = Date.now();
      throw error;
    }
  }

  async getAgentMedia(agentSlug: string, locale: AppLocale) {
    const siteLocale = SITE_LOCALE[locale];
    const slug = agentSlug.toLowerCase().replace(/[^a-z0-9-]/g, "");
    const path = `/${siteLocale}/agents/${slug}/`;
    return this.cache.getOrLoad(`pv:agent:${siteLocale}:${slug}`, { ttlMs: 6 * HOUR, staleIfErrorMs: 72 * HOUR }, async () => {
      const data = await this.page(path);
      const abilities: AgentAbilityMedia[] = parseAgentAbilityVideos(data).map((v) => {
        const item: AgentAbilityMedia = { abilityName: v.title, videoUrl: v.videoUrl };
        if (v.description) item.description = v.description;
        if (v.mimeType) item.mimeType = v.mimeType;
        if (v.thumbnailUrl) item.thumbnailUrl = v.thumbnailUrl;
        return item;
      });
      return {
        abilities,
        source: {
          provider: "playvalorant" as const,
          sourceUrl: `${PLAYVALORANT_ORIGIN}${path}`,
          fetchedAt: new Date().toISOString(),
          attribution: "Riot Games — official VALORANT website",
        },
      };
    });
  }

  async getNews(category: "game-updates" | "all", locale: AppLocale): Promise<NewsArticle[]> {
    const siteLocale = SITE_LOCALE[locale];
    const path = category === "game-updates" ? `/${siteLocale}/news/game-updates/` : `/${siteLocale}/news/`;
    return this.cache.getOrLoad(`pv:news:${siteLocale}:${category}`, { ttlMs: 20 * MINUTE, staleIfErrorMs: 24 * HOUR }, async () => {
      const data = await this.page(path);
      const fetchedAt = new Date().toISOString();
      return parseArticleCards(data, PLAYVALORANT_ORIGIN)
        .slice(0, 30)
        .map((a) => {
          const article: NewsArticle = {
            id: fnv1a(a.url),
            title: a.title,
            url: a.url,
            publishedAt: a.publishedAt,
            source: { provider: "playvalorant", sourceUrl: `${PLAYVALORANT_ORIGIN}${path}`, fetchedAt },
          };
          if (a.description) article.description = a.description;
          if (a.imageUrl) article.imageUrl = a.imageUrl;
          if (a.category) article.category = a.category;
          return article;
        });
    });
  }
}
