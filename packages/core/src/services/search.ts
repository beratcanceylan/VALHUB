import {
  SEARCH_KINDS,
  scoreText,
  tokenize,
  type AppLocale,
  type SearchGroup,
  type SearchKind,
  type SearchResponse,
  type SearchResult,
} from "@valhub/domain";
import type { ContentAdapter, SearchAdapter } from "../adapters/types";
import type { CrosshairPresetRecord } from "../crosshair-presets";

const PER_GROUP = 8;

type Scored = { score: number; result: SearchResult };

/**
 * Entity-aware unified search over on-device sources. Each provider contributes independently; a failing provider
 * is reported in `degraded` while the other groups are still returned.
 */
export class UnifiedSearch implements SearchAdapter {
  constructor(
    private readonly content: ContentAdapter,
    private readonly crosshairs: () => CrosshairPresetRecord[],
  ) {}

  async search(query: string, locale: AppLocale, kinds: SearchKind[] = [...SEARCH_KINDS]): Promise<SearchResponse> {
    const tokens = tokenize(query).slice(0, 8);
    if (tokens.length === 0) return { query, groups: [], degraded: [] };
    const want = new Set(kinds);
    const degraded: string[] = [];
    const scored: Scored[] = [];

    const run = async (name: string, task: () => Promise<Scored[]>) => {
      try {
        scored.push(...(await task()));
      } catch {
        degraded.push(name);
      }
    };

    const score = <T>(items: T[], text: (item: T) => string, wrap: (item: T) => SearchResult): Scored[] =>
      items.flatMap((item) => {
        const s = scoreText(text(item), tokens);
        return s > 0 ? [{ score: s, result: wrap(item) }] : [];
      });

    const agentsPromise = want.has("agent") ? this.content.getAgents(locale) : Promise.resolve([]);
    const mapsPromise = want.has("map") ? this.content.getMaps(locale) : Promise.resolve([]);

    await Promise.all([
      want.has("agent") &&
        run("content", async () => score(await agentsPromise, (a) => `${a.name} ${a.role}`, (item) => ({ kind: "agent", item }))),
      want.has("map") &&
        run("content", async () => score((await mapsPromise).filter((m) => m.isStandard), (m) => m.name, (item) => ({ kind: "map", item }))),
      want.has("weapon") &&
        run("content", async () =>
          score(await this.content.getWeapons(locale), (w) => `${w.name} ${w.category}`, (item) => ({ kind: "weapon", item })),
        ),
      want.has("cosmetic") &&
        run("content", async () => {
          const page = await this.content.getCosmetics({ q: tokens.join(" "), limit: 40 }, locale);
          return score(page.items, (c) => c.name, (item) => ({ kind: "cosmetic", item }));
        }),
      want.has("crosshair") &&
        run("crosshairs", async () =>
          score(
            this.crosshairs(),
            (c) => `${c.name} ${c.tags.join(" ")}`,
            (c) => ({ kind: "crosshair", item: { id: c.id, name: c.name, code: c.code, tags: c.tags } }),
          ),
        ),
    ]);

    const groups: SearchGroup[] = [];
    for (const kind of SEARCH_KINDS) {
      const results = scored
        .filter((s) => s.result.kind === kind)
        .sort((a, b) => b.score - a.score)
        .slice(0, PER_GROUP)
        .map((s) => s.result);
      if (results.length > 0) groups.push({ kind, results });
    }
    return { query, groups, degraded: [...new Set(degraded)] };
  }
}
