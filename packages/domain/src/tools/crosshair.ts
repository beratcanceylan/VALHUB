/**
 * Riot-style crosshair profile codes, e.g. `0;P;c;5;h;0;0l;4;0o;2;0a;1;0f;0;1b;0`.
 *
 * Format: a leading version token, then `;`-separated key/value pairs. The single-letter
 * tokens `P` (primary), `A` (aim-down-sights) and `S` (sniper) switch the active section
 * and carry no value. Unknown keys are preserved so that a parse → generate roundtrip never
 * silently drops settings introduced by future game versions.
 */

export const CROSSHAIR_PRESET_COLORS = [
  { index: 0, name: "white", hex: "#FFFFFF" },
  { index: 1, name: "green", hex: "#00FF00" },
  { index: 2, name: "yellowGreen", hex: "#7FFF00" },
  { index: 3, name: "greenYellow", hex: "#DFFF00" },
  { index: 4, name: "yellow", hex: "#FFFF00" },
  { index: 5, name: "cyan", hex: "#00FFFF" },
  { index: 6, name: "pink", hex: "#FF00FF" },
  { index: 7, name: "red", hex: "#FF0000" },
] as const;

export const CUSTOM_COLOR_INDEX = 8;

export interface CrosshairLineSettings {
  show: boolean;
  thickness: number;
  length: number;
  verticalLength: number;
  separateVertical: boolean;
  offset: number;
  opacity: number;
  movementError: boolean;
  firingError: boolean;
  movementErrorMultiplier: number;
  firingErrorMultiplier: number;
}

export interface CrosshairProfile {
  /** 0–7 preset, or 8 for custom (see `customColor`). */
  colorIndex: number;
  /** `RRGGBBAA`, only meaningful when `colorIndex === 8`. */
  customColor?: string;
  outlines: boolean;
  outlineThickness: number;
  outlineOpacity: number;
  centerDot: boolean;
  centerDotThickness: number;
  centerDotOpacity: number;
  inner: CrosshairLineSettings;
  outer: CrosshairLineSettings;
}

export interface CrosshairSettings {
  primary: CrosshairProfile;
  /** When absent the game copies the primary profile for ADS. */
  ads?: CrosshairProfile;
  /**
   * Sniper-scope center dot. Only values present in the code (or set by the user) are
   * stored, and only those are written back, so generated codes never rely on our
   * knowledge of the game's defaults.
   */
  sniper?: Partial<SniperSettings>;
  /** Raw key/values we do not model, keyed by section, preserved for roundtrips. */
  extra: Record<"P" | "A" | "S" | "G", Record<string, string>>;
}

export interface SniperSettings {
  /** 0–7 preset, or 8 for custom (see `customColor`). */
  colorIndex: number;
  /** `RRGGBBAA`, only meaningful when `colorIndex === 8`. */
  customColor?: string;
  thickness: number;
  opacity: number;
}

/** Shown for sniper values the code does not set; never written into generated codes. */
export const SNIPER_DEFAULTS: Readonly<Required<Omit<SniperSettings, "customColor">>> = { colorIndex: 7, thickness: 1, opacity: 0.75 };

const SNIPER_KEYS: Record<string, keyof Omit<SniperSettings, "customColor">> = { c: "colorIndex", s: "thickness", o: "opacity" };

export const DEFAULT_INNER: CrosshairLineSettings = {
  show: true,
  thickness: 2,
  length: 6,
  verticalLength: 6,
  separateVertical: false,
  offset: 3,
  opacity: 0.8,
  movementError: false,
  firingError: true,
  movementErrorMultiplier: 1,
  firingErrorMultiplier: 1,
};

export const DEFAULT_OUTER: CrosshairLineSettings = {
  show: true,
  thickness: 2,
  length: 2,
  verticalLength: 2,
  separateVertical: false,
  offset: 10,
  opacity: 0.35,
  movementError: true,
  firingError: true,
  movementErrorMultiplier: 1,
  firingErrorMultiplier: 1,
};

export const DEFAULT_PROFILE: CrosshairProfile = {
  colorIndex: 0,
  outlines: true,
  outlineThickness: 1,
  outlineOpacity: 0.5,
  centerDot: false,
  centerDotThickness: 2,
  centerDotOpacity: 1,
  inner: DEFAULT_INNER,
  outer: DEFAULT_OUTER,
};

export function defaultCrosshairSettings(): CrosshairSettings {
  return {
    primary: cloneProfile(DEFAULT_PROFILE),
    extra: { P: {}, A: {}, S: {}, G: {} },
  };
}

export class CrosshairCodeError extends Error {
  readonly reason: "EMPTY" | "VERSION" | "SHAPE" | "VALUE";
  constructor(reason: CrosshairCodeError["reason"], message: string) {
    super(message);
    this.name = "CrosshairCodeError";
    this.reason = reason;
  }
}

type LineKey = keyof CrosshairLineSettings;

const LINE_KEYS: Record<string, { field: LineKey; type: "bool" | "num" }> = {
  b: { field: "show", type: "bool" },
  t: { field: "thickness", type: "num" },
  l: { field: "length", type: "num" },
  v: { field: "verticalLength", type: "num" },
  g: { field: "separateVertical", type: "bool" },
  o: { field: "offset", type: "num" },
  a: { field: "opacity", type: "num" },
  m: { field: "movementError", type: "bool" },
  f: { field: "firingError", type: "bool" },
  s: { field: "movementErrorMultiplier", type: "num" },
  e: { field: "firingErrorMultiplier", type: "num" },
};

type ProfileScalarKey = Exclude<keyof CrosshairProfile, "inner" | "outer" | "customColor">;

const PROFILE_KEYS: Record<string, { field: ProfileScalarKey; type: "bool" | "num" }> = {
  c: { field: "colorIndex", type: "num" },
  h: { field: "outlines", type: "bool" },
  t: { field: "outlineThickness", type: "num" },
  o: { field: "outlineOpacity", type: "num" },
  d: { field: "centerDot", type: "bool" },
  z: { field: "centerDotThickness", type: "num" },
  a: { field: "centerDotOpacity", type: "num" },
};

const SECTION_TOKENS = new Set(["P", "A", "S"]);

function cloneProfile(profile: CrosshairProfile): CrosshairProfile {
  return { ...profile, inner: { ...profile.inner }, outer: { ...profile.outer } };
}

function parseNumber(key: string, raw: string): number {
  const value = Number(raw);
  if (raw.trim() === "" || !Number.isFinite(value)) {
    throw new CrosshairCodeError("VALUE", `Value for "${key}" is not a number: "${raw}"`);
  }
  return value;
}

function parseBool(key: string, raw: string): boolean {
  if (raw === "1") return true;
  if (raw === "0") return false;
  throw new CrosshairCodeError("VALUE", `Value for "${key}" must be 0 or 1: "${raw}"`);
}

function applyKey(profile: CrosshairProfile, key: string, raw: string): boolean {
  if (key === "u") {
    if (!/^[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(raw)) {
      throw new CrosshairCodeError("VALUE", `Custom color must be RRGGBB or RRGGBBAA: "${raw}"`);
    }
    profile.customColor = raw.toUpperCase();
    return true;
  }
  const lineMatch = /^([01])([a-z])$/.exec(key);
  if (lineMatch) {
    const spec = LINE_KEYS[lineMatch[2] ?? ""];
    if (!spec) return false;
    const line = lineMatch[1] === "0" ? profile.inner : profile.outer;
    const value = spec.type === "bool" ? parseBool(key, raw) : parseNumber(key, raw);
    (line as unknown as Record<LineKey, number | boolean>)[spec.field] = value;
    return true;
  }
  const spec = PROFILE_KEYS[key];
  if (!spec) return false;
  const value = spec.type === "bool" ? parseBool(key, raw) : parseNumber(key, raw);
  if (spec.field === "colorIndex") {
    const index = value as number;
    if (!Number.isInteger(index) || index < 0 || index > CUSTOM_COLOR_INDEX) {
      throw new CrosshairCodeError("VALUE", `Color index must be 0–8: "${raw}"`);
    }
  }
  (profile as unknown as Record<ProfileScalarKey, number | boolean>)[spec.field] = value;
  return true;
}

function applySniperKey(settings: CrosshairSettings, key: string, raw: string): boolean {
  if (key === "u") {
    if (!/^[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(raw)) {
      throw new CrosshairCodeError("VALUE", `Custom color must be RRGGBB or RRGGBBAA: "${raw}"`);
    }
    settings.sniper = { ...settings.sniper, customColor: raw.toUpperCase() };
    return true;
  }
  const field = SNIPER_KEYS[key];
  if (!field) return false;
  const value = parseNumber(key, raw);
  if (field === "colorIndex" && (!Number.isInteger(value) || value < 0 || value > CUSTOM_COLOR_INDEX)) {
    throw new CrosshairCodeError("VALUE", `Color index must be 0–8: "${raw}"`);
  }
  settings.sniper = { ...settings.sniper, [field]: value };
  return true;
}

type Section = "G" | "P" | "A" | "S";

/** Applies one `key;value` pair to the section it belongs to; returns false for keys the app does not model. */
function applySectionKey(settings: CrosshairSettings, section: Section, key: string, value: string): boolean {
  if (section === "S") return applySniperKey(settings, key, value);
  if (section === "A") return settings.ads ? applyKey(settings.ads, key, value) : false;
  return applyKey(settings.primary, key, value);
}

export function parseCrosshairCode(input: string): CrosshairSettings {
  const code = input.trim().replace(/;$/, "");
  if (code.length === 0) throw new CrosshairCodeError("EMPTY", "Crosshair code is empty");
  const tokens = code.split(";");
  if (tokens[0] !== "0") {
    throw new CrosshairCodeError("VERSION", "Crosshair code must start with version 0");
  }

  const settings = defaultCrosshairSettings();
  let section: Section = "G";
  let i = 1;
  while (i < tokens.length) {
    const token = tokens[i] ?? "";
    if (SECTION_TOKENS.has(token)) {
      section = token as Section;
      if (section === "A" && !settings.ads) settings.ads = cloneProfile(settings.primary);
      i += 1;
      continue;
    }
    const value = tokens[i + 1];
    if (value === undefined) {
      throw new CrosshairCodeError("SHAPE", `Key "${token}" has no value`);
    }
    if (!/^[0-9a-z]{1,3}$/.test(token)) {
      throw new CrosshairCodeError("SHAPE", `Unexpected token "${token}"`);
    }
    if (!applySectionKey(settings, section, token, value)) settings.extra[section][token] = value;
    i += 2;
  }
  return settings;
}

function formatNumber(value: number): string {
  // Game codes use up to 3 decimals and omit trailing zeros ("0.35", "1", "0.5").
  return String(Number(value.toFixed(3)));
}

function encodeValue(type: "bool" | "num", value: unknown): string {
  if (type === "num") return formatNumber(value as number);
  return value ? "1" : "0";
}

/** `key;value` pairs for every field of `current` that differs from `base`. */
function serializeFields<T extends object>(
  current: T,
  base: T,
  keys: Record<string, { field: keyof T; type: "bool" | "num" }>,
  prefix = "",
): string[] {
  return Object.entries(keys).flatMap(([key, spec]) => {
    const value = current[spec.field];
    return value === base[spec.field] ? [] : [prefix + key, encodeValue(spec.type, value)];
  });
}

function serializeProfile(profile: CrosshairProfile, base: CrosshairProfile): string[] {
  const custom = profile.colorIndex === CUSTOM_COLOR_INDEX && profile.customColor ? ["u", profile.customColor] : [];
  return [
    ...serializeFields(profile, base, PROFILE_KEYS),
    ...custom,
    ...serializeFields(profile.inner, base.inner, LINE_KEYS, "0"),
    ...serializeFields(profile.outer, base.outer, LINE_KEYS, "1"),
  ];
}

function serializeSniper(sniper: Partial<SniperSettings> | undefined): string[] {
  if (!sniper) return [];
  const out: string[] = [];
  if (sniper.colorIndex !== undefined) out.push("c", formatNumber(sniper.colorIndex));
  if (sniper.colorIndex === CUSTOM_COLOR_INDEX && sniper.customColor) out.push("u", sniper.customColor);
  if (sniper.thickness !== undefined) out.push("s", formatNumber(sniper.thickness));
  if (sniper.opacity !== undefined) out.push("o", formatNumber(sniper.opacity));
  return out;
}

function serializeExtra(extra: Record<string, string>): string[] {
  return Object.entries(extra).flatMap(([k, v]) => [k, v]);
}

/** Generates the shortest code (defaults omitted) that reproduces `settings`. */
export function generateCrosshairCode(settings: CrosshairSettings): string {
  const parts: string[] = ["0"];
  const global = serializeExtra(settings.extra.G);
  parts.push(...global);

  const primary = [...serializeProfile(settings.primary, DEFAULT_PROFILE), ...serializeExtra(settings.extra.P)];
  if (primary.length > 0) parts.push("P", ...primary);

  if (settings.ads) {
    const ads = [...serializeProfile(settings.ads, settings.primary), ...serializeExtra(settings.extra.A)];
    parts.push("A", ...ads);
  } else if (Object.keys(settings.extra.A).length > 0) {
    parts.push("A", ...serializeExtra(settings.extra.A));
  }

  const sniper = [...serializeSniper(settings.sniper), ...serializeExtra(settings.extra.S)];
  if (sniper.length > 0) parts.push("S", ...sniper);
  return parts.join(";");
}

/** Resolved `#RRGGBB` or `#RRGGBBAA` display color for the profile. */
export function crosshairColorHex(profile: CrosshairProfile): string {
  if (profile.colorIndex === CUSTOM_COLOR_INDEX && profile.customColor) {
    return `#${profile.customColor}`;
  }
  return CROSSHAIR_PRESET_COLORS[profile.colorIndex]?.hex ?? CROSSHAIR_PRESET_COLORS[0].hex;
}

export function isValidCrosshairCode(input: string): boolean {
  try {
    parseCrosshairCode(input);
    return true;
  } catch {
    return false;
  }
}

/** A sniper value as the game would show it: the code's value, else the documented default. */
export function sniperValue<K extends keyof typeof SNIPER_DEFAULTS>(settings: CrosshairSettings, key: K): number {
  return settings.sniper?.[key] ?? SNIPER_DEFAULTS[key];
}

export function sniperColorHex(settings: CrosshairSettings): string {
  const index = sniperValue(settings, "colorIndex");
  if (index === CUSTOM_COLOR_INDEX && settings.sniper?.customColor) return `#${settings.sniper.customColor}`;
  return CROSSHAIR_PRESET_COLORS[index]?.hex ?? CROSSHAIR_PRESET_COLORS[7].hex;
}

/** Turns on a separate ADS crosshair, starting as an exact copy of the primary one. */
export function enableAds(settings: CrosshairSettings): CrosshairSettings {
  return { ...settings, ads: cloneProfile(settings.primary) };
}

export interface CrosshairRect {
  layer: "inner" | "outer" | "dot";
  side: "left" | "right" | "top" | "bottom" | "center";
  /** Game pixels relative to the screen center. */
  x: number;
  y: number;
  w: number;
  h: number;
  opacity: number;
}

/** Extra offset (game px) at full firing / movement error with a 1× multiplier. Visual approximation. */
const FIRING_SPREAD = 4;
const MOVEMENT_SPREAD = 6;

/**
 * Rectangles the game draws for `profile`, in game pixels around the center. `error.firing`
 * and `error.moving` (0–1) push lines that have the matching error setting outward.
 */
function lineRects(layer: "inner" | "outer", l: CrosshairLineSettings, error: { firing: number; moving: number }): CrosshairRect[] {
  if (!l.show || l.opacity <= 0 || l.thickness <= 0) return [];
  const firing = l.firingError ? error.firing * FIRING_SPREAD * l.firingErrorMultiplier : 0;
  const moving = l.movementError ? error.moving * MOVEMENT_SPREAD * l.movementErrorMultiplier : 0;
  const off = l.offset + firing + moving;
  const th = l.thickness;
  const len = l.length;
  const vlen = l.separateVertical ? l.verticalLength : l.length;
  const rects: CrosshairRect[] = [];
  if (len > 0) {
    rects.push(
      { layer, side: "left", x: -off - len, y: -th / 2, w: len, h: th, opacity: l.opacity },
      { layer, side: "right", x: off, y: -th / 2, w: len, h: th, opacity: l.opacity },
    );
  }
  if (vlen > 0) {
    rects.push(
      { layer, side: "top", x: -th / 2, y: -off - vlen, w: th, h: vlen, opacity: l.opacity },
      { layer, side: "bottom", x: -th / 2, y: off, w: th, h: vlen, opacity: l.opacity },
    );
  }
  return rects;
}

export function crosshairGeometry(profile: CrosshairProfile, error: { firing: number; moving: number }): CrosshairRect[] {
  const rects = [...lineRects("inner", profile.inner, error), ...lineRects("outer", profile.outer, error)];
  if (profile.centerDot && profile.centerDotOpacity > 0) {
    const d = profile.centerDotThickness;
    rects.push({ layer: "dot", side: "center", x: -d / 2, y: -d / 2, w: d, h: d, opacity: profile.centerDotOpacity });
  }
  return rects;
}

/** `RRGGBB`/`RRGGBBAA` (with or without `#`) → uppercase digits as the game writes them, else undefined. */
export function normalizeCrosshairHex(input: string): string | undefined {
  const hex = input.trim().replace(/^#/, "");
  return /^[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(hex) ? hex.toUpperCase() : undefined;
}
