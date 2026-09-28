import type { SourceRef } from "./common";

export type AgentRole = "DUELIST" | "INITIATOR" | "CONTROLLER" | "SENTINEL" | "UNKNOWN";

export type AbilitySlot = "Q" | "E" | "C" | "X" | "PASSIVE";

export interface Ability {
  id: string;
  name: string;
  slot: AbilitySlot;
  description: string;
  iconUrl?: string;
  /** Remote, stream-only demonstration video. Never persisted on device. */
  officialVideoUrl?: string;
  officialVideoMimeType?: string;
}

export interface AgentSummary {
  id: string;
  slug: string;
  name: string;
  role: AgentRole;
  iconUrl?: string;
  /** Full-body key art with a transparent background. */
  portraitUrl?: string;
  /** Provider card gradient, `#RRGGBBAA` stops from top to bottom. */
  gradient?: string[];
}

export interface Agent extends AgentSummary {
  description: string;
  abilities: Ability[];
  source: SourceRef[];
}

export interface MapCallout {
  name: string;
  region: string;
  /** Normalized 0..1 minimap coordinates. */
  x: number;
  y: number;
}

export interface MapSummary {
  id: string;
  slug: string;
  name: string;
  thumbnailUrl?: string;
  /** Wide loading-screen art. */
  splashUrl?: string;
  /** Whether the map is part of standard/competitive rotation (vs. TDM, range…). */
  isStandard: boolean;
}

export interface ValorantMap extends MapSummary {
  overviewImageUrl?: string;
  minimapImageUrl?: string;
  tacticalDescription?: string;
  sites: string[];
  callouts: MapCallout[];
  source: SourceRef[];
}

export type WeaponCategory =
  | "SIDEARM"
  | "SMG"
  | "SHOTGUN"
  | "RIFLE"
  | "SNIPER"
  | "HEAVY"
  | "MELEE"
  | "UNKNOWN";

export interface WeaponSummary {
  id: string;
  slug: string;
  name: string;
  category: WeaponCategory;
  cost?: number;
  iconUrl?: string;
}

export interface DamageRange {
  startMeters: number;
  endMeters: number;
  head: number;
  body: number;
  leg: number;
}

export interface Weapon extends WeaponSummary {
  fireRate?: number;
  magazineSize?: number;
  reloadSeconds?: number;
  equipSeconds?: number;
  firstBulletAccuracy?: number;
  wallPenetration?: "LOW" | "MEDIUM" | "HIGH";
  damageRanges: DamageRange[];
  source: SourceRef[];
}

export type CosmeticKind = "WEAPON_SKIN" | "BUNDLE" | "BUDDY" | "PLAYER_CARD" | "SPRAY" | "TITLE";

export interface CosmeticSummary {
  id: string;
  kind: CosmeticKind;
  name: string;
  thumbnailUrl?: string;
  weaponId?: string;
}

/** What a skin level unlocks. */
export type SkinLevelFeature = "VFX" | "ANIMATION" | "FINISHER" | "SOUND" | "KILL_BANNER" | "KILL_COUNTER" | "INSPECT_KILL" | "TOP_FRAGGER" | "TRANSFORMATION";

export interface CosmeticVariant {
  id: string;
  name: string;
  imageUrl?: string;
  swatchUrl?: string;
  /** Stream-only preview video. */
  videoUrl?: string;
  /** Skin levels only; missing for the base level. */
  feature?: SkinLevelFeature;
}

/** Skin edition (Select, Deluxe, Premium, Exclusive, Ultra). */
export interface ContentTier {
  id: string;
  name: string;
  iconUrl?: string;
  /** `#RRGGBBAA` highlight color. */
  color?: string;
}

export interface Cosmetic extends CosmeticSummary {
  description?: string;
  imageUrl?: string;
  tier?: ContentTier;
  chromas: CosmeticVariant[];
  levels: CosmeticVariant[];
  source: SourceRef[];
}

export interface CosmeticQuery {
  kind?: CosmeticKind;
  weaponId?: string;
  q?: string;
  cursor?: string;
  limit?: number;
}

export interface WikiExcerpt {
  title: string;
  extract: string;
  source: SourceRef;
}

export interface NewsArticle {
  id: string;
  title: string;
  description?: string;
  url: string;
  imageUrl?: string;
  publishedAt: string;
  category?: string;
  source: SourceRef;
}

export type PatchNote = NewsArticle;
