/**
 * VALHUB design tokens. Feature components must consume these through the mobile theme
 * — never hard-code hex values, spacing, radii or type sizes in screens.
 *
 * Palette: warm-neutral graphite base with a single original accent ("signal" — a
 * saturated vermilion leaning away from Riot's red so we never read as the game client).
 */

export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;

export const borderWidth = {
  hairline: 0.5,
  thin: 1,
  thick: 2,
} as const;

export const fontSize = {
  caption: 12,
  bodySm: 14,
  body: 16,
  titleSm: 18,
  title: 22,
  display: 30,
} as const;

export const lineHeight = {
  caption: 16,
  bodySm: 20,
  body: 22,
  titleSm: 24,
  title: 28,
  display: 36,
} as const;

/**
 * iOS type ramp (Apple HIG default Dynamic Type sizes: caption1, subheadline, body, title3,
 * title2, large title). Android keeps the base ramp above, which already tracks Material 3.
 */
export const fontSizeIOS = {
  caption: 12,
  bodySm: 15,
  body: 17,
  titleSm: 20,
  title: 22,
  display: 34,
} as const satisfies Record<keyof typeof fontSize, number>;

export const lineHeightIOS = {
  caption: 16,
  bodySm: 20,
  body: 22,
  titleSm: 25,
  title: 28,
  display: 41,
} as const satisfies Record<keyof typeof fontSize, number>;

export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

export const letterSpacing = {
  tight: -0.3,
  normal: 0,
  label: 0.6,
} as const;

export const motion = {
  fast: 120,
  base: 180,
  slow: 220,
} as const;

export const touchTarget = {
  min: 44,
} as const;

export const elevation = {
  none: 0,
  raised: 2,
  overlay: 8,
} as const;

/** Raw palette; only referenced by the semantic color maps below. */
const palette = {
  ink950: "#0E0F11",
  ink900: "#15171A",
  ink850: "#1B1E22",
  ink800: "#23272C",
  ink700: "#30353C",
  ink600: "#454B54",
  ink500: "#5F6670",
  ink400: "#838A94",
  ink300: "#A9AFB7",
  ink200: "#CDD1D6",
  ink150: "#DEE1E5",
  ink100: "#ECEEF0",
  ink50: "#F6F7F8",
  white: "#FFFFFF",

  signal700: "#B8321F",
  signal600: "#D63F28",
  signal500: "#EE5436",
  signal400: "#F77A5F",
  signal100: "#FDE6E0",
  signal900: "#3A1811",

  green600: "#1F8A5B",
  green400: "#4CC38A",
  green100: "#DDF3E8",
  green900: "#10291D",

  red600: "#C62F3E",
  red400: "#F06A76",
  red100: "#FBE2E5",
  red900: "#33141A",

  amber600: "#A86A00",
  amber400: "#E9A93A",
  amber100: "#FBEFD6",
  amber900: "#2E2208",

  blue600: "#2F63C9",
  blue400: "#6F9BF0",
  blue100: "#E1EAFB",
  blue900: "#121D33",
} as const;

export interface SemanticColors {
  background: string;
  surface: string;
  surfaceSunken: string;
  surfaceRaised: string;
  border: string;
  borderStrong: string;
  divider: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  accent: string;
  accentPressed: string;
  accentSubtle: string;
  onAccent: string;
  positive: string;
  positiveSubtle: string;
  negative: string;
  negativeSubtle: string;
  warning: string;
  warningSubtle: string;
  info: string;
  infoSubtle: string;
  /** Tactical planner team colors. */
  ally: string;
  enemy: string;
  focusRing: string;
  skeleton: string;
  scrim: string;
  /** Text and icons drawn on top of photography/key art (always light, both schemes). */
  onMedia: string;
  onMediaSecondary: string;
  /** Bottom-up darkening behind text on imagery: opaque end and transparent start. */
  mediaScrim: string;
  mediaScrimClear: string;
}

export const lightColors: SemanticColors = {
  background: palette.ink50,
  surface: palette.white,
  surfaceSunken: palette.ink100,
  surfaceRaised: palette.white,
  border: palette.ink150,
  borderStrong: palette.ink300,
  divider: palette.ink150,
  textPrimary: palette.ink950,
  textSecondary: palette.ink600,
  textTertiary: palette.ink500,
  textInverse: palette.white,
  accent: palette.signal600,
  accentPressed: palette.signal700,
  accentSubtle: palette.signal100,
  onAccent: palette.white,
  positive: palette.green600,
  positiveSubtle: palette.green100,
  negative: palette.red600,
  negativeSubtle: palette.red100,
  warning: palette.amber600,
  warningSubtle: palette.amber100,
  info: palette.blue600,
  infoSubtle: palette.blue100,
  ally: palette.blue600,
  enemy: palette.red600,
  focusRing: palette.blue600,
  skeleton: palette.ink150,
  scrim: "rgba(14,15,17,0.45)",
  onMedia: palette.white,
  onMediaSecondary: "rgba(255,255,255,0.8)",
  mediaScrim: "rgba(14,15,17,0.88)",
  mediaScrimClear: "rgba(14,15,17,0)",
};

export const darkColors: SemanticColors = {
  background: palette.ink950,
  surface: palette.ink900,
  surfaceSunken: palette.ink950,
  surfaceRaised: palette.ink850,
  border: palette.ink800,
  borderStrong: palette.ink600,
  divider: palette.ink800,
  textPrimary: palette.ink50,
  textSecondary: palette.ink300,
  textTertiary: palette.ink400,
  textInverse: palette.ink950,
  accent: palette.signal500,
  accentPressed: palette.signal400,
  accentSubtle: palette.signal900,
  onAccent: palette.white,
  positive: palette.green400,
  positiveSubtle: palette.green900,
  negative: palette.red400,
  negativeSubtle: palette.red900,
  warning: palette.amber400,
  warningSubtle: palette.amber900,
  info: palette.blue400,
  infoSubtle: palette.blue900,
  ally: palette.blue400,
  enemy: palette.red400,
  focusRing: palette.blue400,
  skeleton: palette.ink800,
  scrim: "rgba(0,0,0,0.6)",
  onMedia: palette.white,
  onMediaSecondary: "rgba(255,255,255,0.8)",
  mediaScrim: "rgba(14,15,17,0.92)",
  mediaScrimClear: "rgba(14,15,17,0)",
};

export type ColorScheme = "light" | "dark";

export const tokens = {
  space,
  radius,
  borderWidth,
  fontSize,
  lineHeight,
  fontWeight,
  letterSpacing,
  motion,
  touchTarget,
  elevation,
} as const;

export type Tokens = typeof tokens;
export type SpaceToken = keyof typeof space;
export type RadiusToken = keyof typeof radius;
export type TypeVariant = keyof typeof fontSize;
export type ColorToken = keyof SemanticColors;
