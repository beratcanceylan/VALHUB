import type {
  AbilitySlot,
  Agent,
  AgentRole,
  AgentSummary,
  Cosmetic,
  CosmeticSummary,
  ContentTier,
  CosmeticVariant,
  MapCallout,
  MapSummary,
  SkinLevelFeature,
  SourceRef,
  ValorantMap,
  Weapon,
  WeaponCategory,
  WeaponSummary,
} from "@valhub/domain";
import type {
  VapiAgent,
  VapiBundle,
  VapiBuddy,
  VapiContentTier,
  VapiMap,
  VapiPlayerCard,
  VapiSkin,
  VapiSkinVariant,
  VapiSpray,
  VapiWeapon,
} from "./dto";

export const VAPI_BASE = "https://valorant-api.com";

function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** PlayValorant agent URL slug (KAY/O → kay-o), verified against the live site. */
export function officialAgentSlug(name: string): string {
  return slugify(name);
}

function source(path: string, fetchedAt: string): SourceRef {
  return {
    provider: "valorant-api",
    sourceUrl: `${VAPI_BASE}${path}`,
    fetchedAt,
    attribution: "Valorant-API (unofficial community API, not endorsed by Riot Games)",
  };
}

const opt = (value: string | null | undefined): string | undefined => value || undefined;

const ROLE_MAP: Record<string, AgentRole> = {
  duelist: "DUELIST",
  initiator: "INITIATOR",
  controller: "CONTROLLER",
  sentinel: "SENTINEL",
};

function mapRole(displayName: string | undefined): AgentRole {
  return ROLE_MAP[(displayName ?? "").toLowerCase()] ?? "UNKNOWN";
}

const SLOT_MAP: Record<string, AbilitySlot> = {
  Ability1: "Q",
  Ability2: "E",
  Grenade: "C",
  Ultimate: "X",
  Passive: "PASSIVE",
};

const SLOT_ORDER: AbilitySlot[] = ["C", "Q", "E", "X", "PASSIVE"];

export function toAgentSummary(dto: VapiAgent): AgentSummary {
  const summary: AgentSummary = {
    id: dto.uuid,
    slug: slugify(dto.displayName),
    name: dto.displayName,
    role: mapRole(dto.role?.displayName),
  };
  const icon = opt(dto.displayIcon);
  if (icon) summary.iconUrl = icon;
  const portrait = opt(dto.fullPortrait);
  if (portrait) summary.portraitUrl = portrait;
  const gradient = (dto.backgroundGradientColors ?? []).filter((c) => /^[0-9a-f]{8}$/i.test(c)).map((c) => `#${c}`);
  if (gradient.length > 0) summary.gradient = gradient;
  return summary;
}

export function toAgent(dto: VapiAgent, fetchedAt: string): Agent {
  const abilities = dto.abilities
    .filter((a) => SLOT_MAP[a.slot] !== undefined)
    .map((a) => {
      const slot = SLOT_MAP[a.slot] as AbilitySlot;
      const ability: Agent["abilities"][number] = {
        id: `${dto.uuid}:${slot}`,
        name: a.displayName,
        slot,
        description: a.description,
      };
      const icon = opt(a.displayIcon);
      if (icon) ability.iconUrl = icon;
      return ability;
    })
    .sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot));

  const agent: Agent = {
    ...toAgentSummary(dto),
    description: dto.description,
    abilities,
    source: [source(`/v1/agents/${dto.uuid}`, fetchedAt)],
  };
  return agent;
}

function isStandardMap(dto: VapiMap): boolean {
  return Boolean(dto.tacticalDescription && dto.callouts && dto.callouts.length > 0);
}

export function toMapSummary(dto: VapiMap): MapSummary {
  const summary: MapSummary = {
    id: dto.uuid,
    slug: slugify(dto.displayName),
    name: dto.displayName,
    isStandard: isStandardMap(dto),
  };
  const thumb = opt(dto.listViewIcon) ?? opt(dto.splash);
  if (thumb) summary.thumbnailUrl = thumb;
  const splash = opt(dto.splash);
  if (splash) summary.splashUrl = splash;
  return summary;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Game world → minimap UV. Valorant swaps axes: u uses world Y, v uses world X. */
export function toMinimapPoint(dto: Pick<VapiMap, "xMultiplier" | "yMultiplier" | "xScalarToAdd" | "yScalarToAdd">, world: { x: number; y: number }) {
  return {
    x: clamp01(world.y * dto.xMultiplier + dto.xScalarToAdd),
    y: clamp01(world.x * dto.yMultiplier + dto.yScalarToAdd),
  };
}

export function toMap(dto: VapiMap, fetchedAt: string): ValorantMap {
  const callouts: MapCallout[] = (dto.callouts ?? []).map((c) => ({
    name: c.regionName,
    region: c.superRegionName,
    ...toMinimapPoint(dto, c.location),
  }));
  const sites = [...new Set(callouts.map((c) => c.region).filter((r) => /^[A-C]$/.test(r)))].sort((a, b) => a.localeCompare(b));
  const map: ValorantMap = {
    ...toMapSummary(dto),
    sites,
    callouts,
    source: [source(`/v1/maps/${dto.uuid}`, fetchedAt)],
  };
  const overview = opt(dto.splash);
  if (overview) map.overviewImageUrl = overview;
  const minimap = opt(dto.displayIcon);
  if (minimap) map.minimapImageUrl = minimap;
  if (dto.tacticalDescription) map.tacticalDescription = dto.tacticalDescription;
  return map;
}

const WEAPON_CATEGORY: Record<string, WeaponCategory> = {
  Sidearm: "SIDEARM",
  SMG: "SMG",
  Shotgun: "SHOTGUN",
  Rifle: "RIFLE",
  Sniper: "SNIPER",
  Heavy: "HEAVY",
  Melee: "MELEE",
};

function mapWeaponCategory(raw: string): WeaponCategory {
  const key = raw.replace("EEquippableCategory::", "");
  return WEAPON_CATEGORY[key] ?? "UNKNOWN";
}

export function toWeaponSummary(dto: VapiWeapon): WeaponSummary {
  const summary: WeaponSummary = {
    id: dto.uuid,
    slug: slugify(dto.displayName),
    name: dto.displayName,
    category: mapWeaponCategory(dto.category),
  };
  if (dto.shopData) summary.cost = dto.shopData.cost;
  const icon = opt(dto.displayIcon);
  if (icon) summary.iconUrl = icon;
  return summary;
}

const PENETRATION: Record<string, Weapon["wallPenetration"]> = {
  Low: "LOW",
  Medium: "MEDIUM",
  High: "HIGH",
};

export function toWeapon(dto: VapiWeapon, fetchedAt: string): Weapon {
  const stats = dto.weaponStats;
  const weapon: Weapon = {
    ...toWeaponSummary(dto),
    damageRanges: (stats?.damageRanges ?? []).map((r) => ({
      startMeters: r.rangeStartMeters,
      endMeters: r.rangeEndMeters,
      head: r.headDamage,
      body: r.bodyDamage,
      leg: r.legDamage,
    })),
    source: [source(`/v1/weapons/${dto.uuid}`, fetchedAt)],
  };
  if (stats) {
    weapon.fireRate = stats.fireRate;
    weapon.magazineSize = stats.magazineSize;
    weapon.reloadSeconds = stats.reloadTimeSeconds;
    weapon.equipSeconds = stats.equipTimeSeconds;
    weapon.firstBulletAccuracy = stats.firstBulletAccuracy;
    const pen = PENETRATION[stats.wallPenetration.replace("EWallPenetrationDisplayType::", "")];
    if (pen) weapon.wallPenetration = pen;
  }
  return weapon;
}

/** Placeholder skins that are not real cosmetics. */
export function isRealSkin(skin: VapiSkin): boolean {
  return !/^(standard|random favorite)/i.test(skin.displayName) && !skin.displayName.startsWith("Melee");
}

const LEVEL_FEATURE: Record<string, SkinLevelFeature> = {
  VFX: "VFX",
  Animation: "ANIMATION",
  Finisher: "FINISHER",
  SoundEffects: "SOUND",
  KillBanner: "KILL_BANNER",
  KillCounter: "KILL_COUNTER",
  InspectAndKill: "INSPECT_KILL",
  TopFrag: "TOP_FRAGGER",
  Transformation: "TRANSFORMATION",
};

function variant(v: VapiSkinVariant): CosmeticVariant {
  const out: CosmeticVariant = { id: v.uuid, name: v.displayName };
  const image = opt(v.fullRender) ?? opt(v.displayIcon);
  if (image) out.imageUrl = image;
  const swatch = opt(v.swatch);
  if (swatch) out.swatchUrl = swatch;
  const video = opt(v.streamedVideo);
  if (video) out.videoUrl = video;
  const feature = LEVEL_FEATURE[(v.levelItem ?? "").replace("EEquippableSkinLevelItem::", "")];
  if (feature) out.feature = feature;
  return out;
}

export function toContentTier(dto: VapiContentTier): ContentTier {
  const tier: ContentTier = { id: dto.uuid, name: dto.devName || dto.displayName };
  const icon = opt(dto.displayIcon);
  if (icon) tier.iconUrl = icon;
  if (dto.highlightColor && /^[0-9a-f]{8}$/i.test(dto.highlightColor)) tier.color = `#${dto.highlightColor}`;
  return tier;
}

function skinThumb(skin: VapiSkin): string | undefined {
  return opt(skin.displayIcon) ?? opt(skin.chromas[0]?.fullRender) ?? opt(skin.chromas[0]?.displayIcon);
}

export function skinToSummary(skin: VapiSkin, weaponId: string): CosmeticSummary {
  const s: CosmeticSummary = { id: skin.uuid, kind: "WEAPON_SKIN", name: skin.displayName, weaponId };
  const thumb = skinThumb(skin);
  if (thumb) s.thumbnailUrl = thumb;
  return s;
}

export function skinToCosmetic(skin: VapiSkin, weaponId: string, fetchedAt: string, tier?: ContentTier): Cosmetic {
  const c: Cosmetic = {
    ...skinToSummary(skin, weaponId),
    chromas: skin.chromas.map(variant),
    levels: skin.levels.map(variant),
    source: [source(`/v1/weapons/skins/${skin.uuid}`, fetchedAt)],
  };
  if (tier) c.tier = tier;
  const image = opt(skin.chromas[0]?.fullRender) ?? skinThumb(skin);
  if (image) c.imageUrl = image;
  return c;
}

type SimpleCosmetic =
  | { kind: "BUNDLE"; dto: VapiBundle }
  | { kind: "BUDDY"; dto: VapiBuddy }
  | { kind: "PLAYER_CARD"; dto: VapiPlayerCard }
  | { kind: "SPRAY"; dto: VapiSpray };

const SIMPLE_PATH: Record<SimpleCosmetic["kind"], string> = {
  BUNDLE: "bundles",
  BUDDY: "buddies",
  PLAYER_CARD: "playercards",
  SPRAY: "sprays",
};

export function simpleToSummary(input: SimpleCosmetic): CosmeticSummary {
  const s: CosmeticSummary = { id: input.dto.uuid, kind: input.kind, name: input.dto.displayName };
  const thumb = opt(input.dto.displayIcon);
  if (thumb) s.thumbnailUrl = thumb;
  return s;
}

export function simpleToCosmetic(input: SimpleCosmetic, fetchedAt: string): Cosmetic {
  const c: Cosmetic = {
    ...simpleToSummary(input),
    chromas: [],
    levels: [],
    source: [source(`/v1/${SIMPLE_PATH[input.kind]}/${input.dto.uuid}`, fetchedAt)],
  };
  let image: string | undefined;
  switch (input.kind) {
    case "BUNDLE":
      image = opt(input.dto.displayIcon2) ?? opt(input.dto.displayIcon);
      if (input.dto.description) c.description = input.dto.description;
      break;
    case "PLAYER_CARD":
      image = opt(input.dto.largeArt) ?? opt(input.dto.wideArt);
      break;
    case "SPRAY":
      image = opt(input.dto.animationGif) ?? opt(input.dto.fullTransparentIcon) ?? opt(input.dto.displayIcon);
      break;
    case "BUDDY":
      image = opt(input.dto.displayIcon);
      break;
  }
  if (image) c.imageUrl = image;
  return c;
}

export type { SimpleCosmetic };
