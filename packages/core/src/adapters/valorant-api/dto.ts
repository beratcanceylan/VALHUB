/**
 * valorant-api.com response DTOs (unofficial community provider). These types MUST stay
 * inside this adapter folder; everything leaving it is a domain entity.
 */

export interface VapiEnvelope<T> {
  status: number;
  data: T;
}

interface VapiAbility {
  slot: string;
  displayName: string;
  description: string;
  displayIcon: string | null;
}

export interface VapiAgent {
  uuid: string;
  displayName: string;
  description: string;
  displayIcon: string | null;
  displayIconSmall: string | null;
  fullPortrait: string | null;
  fullPortraitV2?: string | null;
  /** Four `RRGGBBAA` stops used behind the agent's key art. */
  backgroundGradientColors?: string[] | null;
  isPlayableCharacter: boolean;
  role: { uuid: string; displayName: string } | null;
  abilities: VapiAbility[];
}

interface VapiCallout {
  regionName: string;
  superRegionName: string;
  location: { x: number; y: number };
}

export interface VapiMap {
  uuid: string;
  displayName: string;
  tacticalDescription: string | null;
  coordinates: string | null;
  displayIcon: string | null;
  listViewIcon: string | null;
  splash: string | null;
  mapUrl: string;
  xMultiplier: number;
  yMultiplier: number;
  xScalarToAdd: number;
  yScalarToAdd: number;
  callouts: VapiCallout[] | null;
}

interface VapiDamageRange {
  rangeStartMeters: number;
  rangeEndMeters: number;
  headDamage: number;
  bodyDamage: number;
  legDamage: number;
}

export interface VapiWeapon {
  uuid: string;
  displayName: string;
  category: string;
  displayIcon: string | null;
  killStreamIcon?: string | null;
  weaponStats: {
    fireRate: number;
    magazineSize: number;
    reloadTimeSeconds: number;
    equipTimeSeconds: number;
    firstBulletAccuracy: number;
    wallPenetration: string;
    damageRanges: VapiDamageRange[];
  } | null;
  shopData: { cost: number; category: string } | null;
}

export interface VapiSkinVariant {
  uuid: string;
  displayName: string;
  displayIcon: string | null;
  fullRender?: string | null;
  swatch?: string | null;
  streamedVideo: string | null;
  /** Levels only, e.g. `EEquippableSkinLevelItem::VFX`; null for the base level. */
  levelItem?: string | null;
}

export interface VapiSkin {
  uuid: string;
  displayName: string;
  displayIcon: string | null;
  contentTierUuid: string | null;
  chromas: VapiSkinVariant[];
  levels: VapiSkinVariant[];
}

export interface VapiWeaponWithSkins extends VapiWeapon {
  skins: VapiSkin[];
}

export interface VapiBundle {
  uuid: string;
  displayName: string;
  description: string | null;
  displayIcon: string | null;
  displayIcon2?: string | null;
}

export interface VapiBuddy {
  uuid: string;
  displayName: string;
  displayIcon: string | null;
  /** Store offers sell buddy *levels*. */
  levels?: Array<{ uuid: string; displayName: string; displayIcon: string | null }>;
}

export interface VapiPlayerTitle {
  uuid: string;
  displayName: string | null;
  titleText: string | null;
}

export interface VapiContentTier {
  uuid: string;
  devName: string;
  displayName: string;
  highlightColor: string | null;
  displayIcon: string | null;
}

export interface VapiCurrency {
  uuid: string;
  displayIcon: string | null;
  largeIcon?: string | null;
}

export interface VapiSeason {
  uuid: string;
  displayName: string;
  type: string | null;
  startTime: string;
  endTime: string;
}

export interface VapiPlayerCard {
  uuid: string;
  displayName: string;
  displayIcon: string | null;
  largeArt: string | null;
  wideArt: string | null;
}

export interface VapiSpray {
  uuid: string;
  displayName: string;
  displayIcon: string | null;
  fullTransparentIcon: string | null;
  animationGif?: string | null;
}

export interface VapiCompetitiveTierSet {
  uuid: string;
  tiers: Array<{ tier: number; tierName: string; smallIcon: string | null }>;
}
