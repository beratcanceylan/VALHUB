import { AppError, type AppLocale, type CapabilityState, type WikiExcerpt } from "@valhub/domain";
import { HOUR, MINUTE, TtlCache } from "../../lib/cache";
import { fetchJson } from "../../lib/http";
import { ProviderLimiter } from "../../lib/rate-limit";
import type { WikiContentAdapter } from "../types";

export const WIKI_BASE = "https://wiki.playvalorant.com";
export const WIKI_LICENSE = "CC BY-SA 3.0";
export const WIKI_LICENSE_URL = "https://creativecommons.org/licenses/by-sa/3.0/";
const WIKI_ATTRIBUTION =
  "VALORANT Wiki contributors — player-maintained, hosted by Weird Gloop, not owned or operated by Riot Games";

/** The wiki currently publishes an English edition; other locales fall back to English. */
const WIKI_EDITIONS: Partial<Record<AppLocale, string>> = { en: "en-us" };

interface MediaWikiQuery {
  query?: {
    pages?: Record<
      string,
      {
        pageid?: number;
        title: string;
        missing?: string;
        extract?: string;
        revisions?: Array<{ revid: number; timestamp: string }>;
      }
    >;
  };
}

/**
 * Reads normalized, attributed excerpts through the MediaWiki API (no HTML scraping, no
 * dumps). Every excerpt carries source URL, revision and CC BY-SA license metadata.
 */
export class WikiAdapter implements WikiContentAdapter {
  private readonly limiter = new ProviderLimiter("valorant-wiki", 10, 2);

  constructor(private readonly cache: TtlCache) {}

  capabilities(): CapabilityState[] {
    return [{ capability: "WIKI", available: true }];
  }

  async getExcerpt(title: string, locale: AppLocale): Promise<WikiExcerpt> {
    const edition = WIKI_EDITIONS[locale] ?? "en-us";
    const clean = title.trim().slice(0, 200);
    if (!clean) throw new AppError("VALIDATION", "Title required");
    return this.cache.getOrLoad(`wiki:${edition}:${clean}`, { ttlMs: 30 * MINUTE, staleIfErrorMs: 24 * HOUR }, async () => {
      const params = new URLSearchParams({
        action: "query",
        format: "json",
        formatversion: "1",
        redirects: "1",
        prop: "extracts|revisions",
        exintro: "1",
        explaintext: "1",
        exsectionformat: "plain",
        rvprop: "ids|timestamp",
        titles: clean,
      });
      const body = await fetchJson<MediaWikiQuery>(`${WIKI_BASE}/${edition}/api.php?${params.toString()}`, {
        limiter: this.limiter,
      });
      const page = Object.values(body.query?.pages ?? {})[0];
      if (!page || page.missing !== undefined || !page.extract) {
        throw new AppError("NOT_FOUND", "Wiki page not found");
      }
      const revision = page.revisions?.[0];
      const excerpt: WikiExcerpt = {
        title: page.title,
        extract: page.extract.trim(),
        source: {
          provider: "valorant-wiki",
          sourceUrl: `${WIKI_BASE}/${edition}/${encodeURIComponent(page.title.replaceAll(" ", "_"))}`,
          fetchedAt: new Date().toISOString(),
          license: WIKI_LICENSE,
          attribution: WIKI_ATTRIBUTION,
        },
      };
      if (revision) excerpt.source.revision = `${revision.revid}@${revision.timestamp}`;
      return excerpt;
    });
  }
}
