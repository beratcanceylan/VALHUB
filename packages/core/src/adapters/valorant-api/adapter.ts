import {
  AppError,
  RIOT_LOCALE,
  normalizeSearchText,
  type AppLocale,
  type CapabilityState,
  type CosmeticQuery,
  type CosmeticSummary,
  type CurrencyIcons,
  type Page,
} from "@valhub/domain";
import { HOUR, TtlCache } from "../../lib/cache";
import { KC, RP, VP } from "../../riot-client/store";
import { fetchJson } from "../../lib/http";
import { ProviderLimiter } from "../../lib/rate-limit";
import type { CatalogItem, ContentAdapter } from "../types";
import type {
  VapiAgent,
  VapiBundle,
  VapiBuddy,
  VapiCompetitiveTierSet,
  VapiContentTier,
  VapiCurrency,
  VapiEnvelope,
  VapiMap,
  VapiPlayerCard,
  VapiPlayerTitle,
  VapiSeason,
  VapiSpray,
  VapiWeaponWithSkins,
} from "./dto";
import {
  VAPI_BASE,
  isRealSkin,
  officialAgentSlug,
  simpleToCosmetic,
  simpleToSummary,
  skinToCosmetic,
  skinToSummary,
  toAgent,
  toContentTier,
  toAgentSummary,
  toMap,
  toMapSummary,
  toWeapon,
  toWeaponSummary,
} from "./mapper";

const CONTENT_TTL = { ttlMs: 6 * HOUR, staleIfErrorMs: 48 * HOUR };

type PutCatalogItem = (
  id: string,
  item: { kind: CatalogItem["kind"]; name: string; imageUrl?: string | null; cosmeticId?: string },
) => void;

/** Skins, their upgrade levels and chromas all resolve to the same store item. */
function indexWeaponSkins(put: PutCatalogItem, weapons: readonly VapiWeaponWithSkins[]): void {
  for (const weapon of weapons) {
    for (const skin of weapon.skins) {
      const imageUrl = skin.levels[0]?.displayIcon ?? skin.displayIcon ?? skin.chromas[0]?.fullRender;
      const entry = { kind: "WEAPON_SKIN" as const, name: skin.displayName, imageUrl, cosmeticId: skin.uuid };
      put(skin.uuid, entry);
      for (const level of skin.levels) put(level.uuid, entry);
      for (const chroma of skin.chromas) put(chroma.uuid, { ...entry, name: chroma.displayName, imageUrl: chroma.fullRender ?? chroma.displayIcon ?? imageUrl });
    }
  }
}

function indexBuddies(put: PutCatalogItem, buddies: readonly VapiBuddy[]): void {
  for (const b of buddies) {
    const entry = { kind: "BUDDY" as const, name: b.displayName, imageUrl: b.displayIcon, cosmeticId: b.uuid };
    put(b.uuid, entry);
    for (const level of b.levels ?? []) put(level.uuid, entry);
  }
}

export class ValorantApiContentAdapter implements ContentAdapter {
  private readonly limiter = new ProviderLimiter("valorant-api", 20, 5);
  private lastFailureAt = 0;

  constructor(private readonly cache: TtlCache) {}

  capabilities(): CapabilityState[] {
    const recentlyFailed = Date.now() - this.lastFailureAt < 60_000;
    return [
      recentlyFailed
        ? { capability: "GAME_CONTENT", available: false, reason: "UPSTREAM_DOWN" }
        : { capability: "GAME_CONTENT", available: true },
    ];
  }

  private async get<T>(path: string, locale: AppLocale): Promise<{ data: T; fetchedAt: string }> {
    const lang = RIOT_LOCALE[locale];
    const sep = path.includes("?") ? "&" : "?";
    return this.cache.getOrLoad(`vapi:${path}:${lang}`, CONTENT_TTL, async () => {
      try {
        const body = await fetchJson<VapiEnvelope<T>>(`${VAPI_BASE}${path}${sep}language=${lang}`, {
          limiter: this.limiter,
          timeoutMs: 10_000,
        });
        return { data: body.data, fetchedAt: new Date().toISOString() };
      } catch (error) {
        this.lastFailureAt = Date.now();
        throw error;
      }
    });
  }

  private agentsRaw(locale: AppLocale) {
    return this.get<VapiAgent[]>("/v1/agents?isPlayableCharacter=true", locale);
  }

  async getAgents(locale: AppLocale) {
    const { data } = await this.agentsRaw(locale);
    return data.map(toAgentSummary).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getAgent(idOrSlug: string, locale: AppLocale) {
    const { data, fetchedAt } = await this.agentsRaw(locale);
    const dto = data.find(
      (a) => a.uuid === idOrSlug || toAgentSummary(a).slug === idOrSlug || officialAgentSlug(a.displayName) === idOrSlug,
    );
    if (!dto) throw new AppError("NOT_FOUND", "Agent not found");
    return toAgent(dto, fetchedAt);
  }

  private mapsRaw(locale: AppLocale) {
    return this.get<VapiMap[]>("/v1/maps", locale);
  }

  async getMaps(locale: AppLocale) {
    const { data } = await this.mapsRaw(locale);
    return data
      .map(toMapSummary)
      .sort((a, b) => Number(b.isStandard) - Number(a.isStandard) || a.name.localeCompare(b.name));
  }

  async getMap(idOrSlug: string, locale: AppLocale) {
    const { data, fetchedAt } = await this.mapsRaw(locale);
    const dto = data.find((m) => m.uuid === idOrSlug || toMapSummary(m).slug === idOrSlug);
    if (!dto) throw new AppError("NOT_FOUND", "Map not found");
    return toMap(dto, fetchedAt);
  }

  async resolveMapAssetPath(path: string) {
    const { data } = await this.mapsRaw("en");
    return data.find((m) => m.mapUrl === path)?.uuid;
  }

  private weaponsRaw(locale: AppLocale) {
    return this.get<VapiWeaponWithSkins[]>("/v1/weapons", locale);
  }

  async getWeapons(locale: AppLocale) {
    const { data } = await this.weaponsRaw(locale);
    const order = ["SIDEARM", "SMG", "SHOTGUN", "RIFLE", "SNIPER", "HEAVY", "MELEE", "UNKNOWN"];
    return data
      .map(toWeaponSummary)
      .sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category) || (a.cost ?? 0) - (b.cost ?? 0));
  }

  async getWeapon(idOrSlug: string, locale: AppLocale) {
    const { data, fetchedAt } = await this.weaponsRaw(locale);
    const dto = data.find((w) => w.uuid === idOrSlug || toWeaponSummary(w).slug === idOrSlug);
    if (!dto) throw new AppError("NOT_FOUND", "Weapon not found");
    return toWeapon(dto, fetchedAt);
  }

  private async allCosmeticSummaries(locale: AppLocale): Promise<CosmeticSummary[]> {
    return this.cache.getOrLoad(`vapi:cosmetic-index:${locale}`, CONTENT_TTL, async () => {
      const [weapons, bundles, buddies, cards, sprays] = await Promise.all([
        this.weaponsRaw(locale),
        this.get<VapiBundle[]>("/v1/bundles", locale),
        this.get<VapiBuddy[]>("/v1/buddies", locale),
        this.get<VapiPlayerCard[]>("/v1/playercards", locale),
        this.get<VapiSpray[]>("/v1/sprays", locale),
      ]);
      const skins = weapons.data.flatMap((w) => w.skins.filter(isRealSkin).map((s) => skinToSummary(s, w.uuid)));
      return [
        ...bundles.data.map((dto) => simpleToSummary({ kind: "BUNDLE", dto })),
        ...skins,
        ...buddies.data.map((dto) => simpleToSummary({ kind: "BUDDY", dto })),
        ...cards.data.map((dto) => simpleToSummary({ kind: "PLAYER_CARD", dto })),
        ...sprays.data.map((dto) => simpleToSummary({ kind: "SPRAY", dto })),
      ];
    });
  }

  async getCosmetics(query: CosmeticQuery, locale: AppLocale): Promise<Page<CosmeticSummary>> {
    const all = await this.allCosmeticSummaries(locale);
    const needle = query.q ? normalizeSearchText(query.q) : "";
    const filtered = all.filter(
      (c) =>
        (!query.kind || c.kind === query.kind) &&
        (!query.weaponId || c.weaponId === query.weaponId) &&
        (!needle || normalizeSearchText(c.name).includes(needle)),
    );
    const limit = Math.min(Math.max(query.limit ?? 40, 1), 100);
    const offset = query.cursor ? Math.max(0, Number.parseInt(query.cursor, 10) || 0) : 0;
    const items = filtered.slice(offset, offset + limit);
    const page: Page<CosmeticSummary> = { items, total: filtered.length };
    if (offset + limit < filtered.length) page.nextCursor = String(offset + limit);
    return page;
  }

  async getCosmetic(id: string, locale: AppLocale) {
    const weapons = await this.weaponsRaw(locale);
    for (const w of weapons.data) {
      const skin = w.skins.find((s) => s.uuid === id);
      if (!skin) continue;
      // The edition badge is decoration: a failed tier lookup never hides the skin.
      const tiers = await this.get<VapiContentTier[]>("/v1/contenttiers", locale).catch(() => undefined);
      const tier = tiers?.data.find((t) => t.uuid === skin.contentTierUuid);
      return skinToCosmetic(skin, w.uuid, weapons.fetchedAt, tier ? toContentTier(tier) : undefined);
    }
    const lookups = [
      ["BUNDLE", "/v1/bundles"],
      ["BUDDY", "/v1/buddies"],
      ["PLAYER_CARD", "/v1/playercards"],
      ["SPRAY", "/v1/sprays"],
    ] as const;
    for (const [kind, path] of lookups) {
      const { data, fetchedAt } = await this.get<Array<{ uuid: string }>>(path, locale);
      const dto = data.find((d) => d.uuid === id);
      if (dto) return simpleToCosmetic({ kind, dto } as Parameters<typeof simpleToCosmetic>[0], fetchedAt);
    }
    throw new AppError("NOT_FOUND", "Cosmetic not found");
  }

  /**
   * Every item id the store can sell (skin levels and chromas, buddy levels, sprays, cards,
   * titles, bundles) → its name, art and the catalogue entry that describes it.
   */
  async getCatalogIndex(locale: AppLocale): Promise<Map<string, CatalogItem>> {
    return this.cache.getOrLoad(`vapi:catalog-index:${locale}`, CONTENT_TTL, async () => {
      const [weapons, bundles, buddies, cards, sprays, titles] = await Promise.all([
        this.weaponsRaw(locale),
        this.get<VapiBundle[]>("/v1/bundles", locale),
        this.get<VapiBuddy[]>("/v1/buddies", locale),
        this.get<VapiPlayerCard[]>("/v1/playercards", locale),
        this.get<VapiSpray[]>("/v1/sprays", locale),
        this.get<VapiPlayerTitle[]>("/v1/playertitles", locale).catch(() => ({ data: [] as VapiPlayerTitle[] })),
      ]);
      const index = new Map<string, CatalogItem>();
      const put: PutCatalogItem = (id, item) => {
        index.set(id, {
          kind: item.kind,
          name: item.name,
          ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}),
          ...(item.cosmeticId ? { cosmeticId: item.cosmeticId } : {}),
        });
      };
      indexWeaponSkins(put, weapons.data);
      for (const b of bundles.data) put(b.uuid, { kind: "BUNDLE", name: b.displayName, imageUrl: b.displayIcon2 ?? b.displayIcon, cosmeticId: b.uuid });
      indexBuddies(put, buddies.data);
      for (const c of cards.data) put(c.uuid, { kind: "PLAYER_CARD", name: c.displayName, imageUrl: c.wideArt ?? c.displayIcon, cosmeticId: c.uuid });
      for (const sp of sprays.data) put(sp.uuid, { kind: "SPRAY", name: sp.displayName, imageUrl: sp.fullTransparentIcon ?? sp.displayIcon, cosmeticId: sp.uuid });
      for (const title of titles.data) {
        const name = title.titleText ?? title.displayName;
        if (name) put(title.uuid, { kind: "TITLE", name });
      }
      return index;
    });
  }

  async getCurrencyIcons(): Promise<CurrencyIcons> {
    const { data } = await this.get<VapiCurrency[]>("/v1/currencies", "en");
    const icons: CurrencyIcons = {};
    for (const [id, currency] of [[VP, "VP"], [KC, "KC"], [RP, "RP"]] as const) {
      const icon = data.find((c) => c.uuid === id)?.displayIcon;
      if (icon) icons[currency] = icon;
    }
    return icons;
  }

  /** The competitive act running at `now`, from the season calendar. */
  async getCurrentActId(now: number) {
    const { data } = await this.get<VapiSeason[]>("/v1/seasons", "en");
    const act = data.find((x) => (x.type ?? "").endsWith("Act") && Date.parse(x.startTime) <= now && now < Date.parse(x.endTime));
    return act?.uuid;
  }

  async getTierName(tier: number, locale: AppLocale) {
    const { data } = await this.get<VapiCompetitiveTierSet[]>("/v1/competitivetiers", locale);
    const latest = data.at(-1);
    return latest?.tiers.find((t) => t.tier === tier)?.tierName;
  }
}
