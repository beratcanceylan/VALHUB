import type {
  Agent,
  AgentSummary,
  AppLocale,
  CapabilityState,
  Cosmetic,
  CosmeticKind,
  CosmeticQuery,
  CurrencyIcons,
  CosmeticSummary,
  MapSummary,
  NewsArticle,
  Page,
  SearchKind,
  SearchResponse,
  SourceRef,
  ValorantMap,
  Weapon,
  WeaponSummary,
  WikiExcerpt,
} from "@valhub/domain";

/**
 * Adapter contracts. Every implementation maps provider DTOs → domain entities; no
 * provider type may appear in these signatures.
 */

interface CapabilityReporter {
  capabilities(): CapabilityState[];
}

export interface ContentAdapter extends CapabilityReporter {
  getAgents(locale: AppLocale): Promise<AgentSummary[]>;
  getAgent(id: string, locale: AppLocale): Promise<Agent>;
  getMaps(locale: AppLocale): Promise<MapSummary[]>;
  getMap(id: string, locale: AppLocale): Promise<ValorantMap>;
  getWeapons(locale: AppLocale): Promise<WeaponSummary[]>;
  getWeapon(id: string, locale: AppLocale): Promise<Weapon>;
  getCosmetics(query: CosmeticQuery, locale: AppLocale): Promise<Page<CosmeticSummary>>;
  getCosmetic(id: string, locale: AppLocale): Promise<Cosmetic>;
  /** Resolves Riot match `mapId` asset paths (e.g. `/Game/Maps/Ascent/Ascent`) to map ids. */
  resolveMapAssetPath(path: string): Promise<string | undefined>;
  /** Official competitive tier display names for the current episode. */
  getTierName(tier: number, locale: AppLocale): Promise<string | undefined>;
  /** Sellable item id → name, art and catalogue entry, for dressing the personal store. */
  getCatalogIndex(locale: AppLocale): Promise<Map<string, CatalogItem>>;
  /** Symbol art for VP, Kingdom Credits and Radianite. */
  getCurrencyIcons(): Promise<CurrencyIcons>;
  /** Id of the competitive act running at `now`. */
  getCurrentActId(now: number): Promise<string | undefined>;
}

export interface CatalogItem {
  kind: CosmeticKind;
  name: string;
  imageUrl?: string;
  /** Detail page id; titles have none. */
  cosmeticId?: string;
}

export interface WikiContentAdapter extends CapabilityReporter {
  getExcerpt(title: string, locale: AppLocale): Promise<WikiExcerpt>;
}

export interface AgentAbilityMedia {
  abilityName: string;
  description?: string;
  videoUrl: string;
  mimeType?: string;
  thumbnailUrl?: string;
}

export interface OfficialAgentMediaAdapter extends CapabilityReporter {
  getAgentMedia(agentSlug: string, locale: AppLocale): Promise<{ abilities: AgentAbilityMedia[]; source: SourceRef }>;
}

export interface NewsAdapter extends CapabilityReporter {
  getNews(category: "game-updates" | "all", locale: AppLocale): Promise<NewsArticle[]>;
}

export interface SearchAdapter {
  search(query: string, locale: AppLocale, kinds?: SearchKind[]): Promise<SearchResponse>;
}
