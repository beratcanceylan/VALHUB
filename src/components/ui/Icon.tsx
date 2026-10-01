import { SymbolView, type AndroidSymbol, type SFSymbol } from "expo-symbols";
import type { ColorToken } from "@valhub/design-tokens";
import { useTheme } from "@/design/theme";

/**
 * The app's icon vocabulary: each name maps to the platform's own glyph, SF Symbols on iOS and
 * Material Symbols on Android. Screens refer to names, never to a glyph set.
 */
const ICONS = {
  home: ["house", "home"],
  performance: ["chart.line.uptrend.xyaxis", "show_chart"],
  guide: ["book", "menu_book"],
  account: ["person.crop.circle", "account_circle"],
  library: ["bookmark", "bookmark"],
  saved: ["bookmark.fill", "bookmark_added"],
  search: ["magnifyingglass", "search"],
  settings: ["gearshape", "settings"],
  chevronRight: ["chevron.right", "chevron_right"],
  chevronDown: ["chevron.down", "expand_more"],
  back: ["arrow.left", "arrow_back"],
  close: ["xmark", "close"],
  check: ["checkmark", "check"],
  play: ["play.fill", "play_arrow"],
  plus: ["plus", "add"],
  trash: ["trash", "delete"],
  copy: ["doc.on.doc", "content_copy"],
  paste: ["doc.on.clipboard", "content_paste"],
  share: ["square.and.arrow.up", "share"],
  filter: ["slider.horizontal.3", "tune"],
  refresh: ["arrow.clockwise", "refresh"],
  external: ["arrow.up.right.square", "open_in_new"],
  arrow: ["arrow.up.right", "arrow_outward"],
  alert: ["exclamationmark.triangle", "warning"],
  offline: ["wifi.slash", "wifi_off"],
  clock: ["clock", "schedule"],
  timer: ["timer", "timer"],
  bell: ["bell", "notifications"],
  user: ["person", "person"],
  crosshair: ["scope", "my_location"],
  gauge: ["gauge.with.dots.needle.33percent", "speed"],
  zap: ["bolt", "bolt"],
  map: ["map", "map"],
  pin: ["mappin", "location_on"],
  layers: ["square.3.layers.3d", "layers"],
  swords: ["gamecontroller", "sports_esports"],
  pencil: ["pencil", "edit"],
  undo: ["arrow.uturn.backward", "undo"],
  redo: ["arrow.uturn.forward", "redo"],
  eraser: ["eraser", "ink_eraser"],
  text: ["textformat", "title"],
  select: ["cursorarrow", "arrow_selector_tool"],
  area: ["square", "crop_square"],
  dot: ["circle", "circle"],
  lock: ["lock", "lock"],
  trophy: ["trophy", "trophy"],
  store: ["bag", "shopping_bag"],
  signOut: ["rectangle.portrait.and.arrow.right", "logout"],
  news: ["newspaper", "newspaper"],
  language: ["globe", "language"],
  document: ["doc.text", "description"],
  privacy: ["hand.raised", "policy"],
} as const satisfies Record<string, readonly [SFSymbol, AndroidSymbol]>;

export type IconName = keyof typeof ICONS;

export interface IconProps {
  name: IconName;
  size?: number;
  color?: ColorToken;
}

/** Decorative glyph; the control around it carries the accessible name. */
export function Icon({ name, size = 20, color = "textPrimary" }: Readonly<IconProps>) {
  const t = useTheme();
  const [ios, android] = ICONS[name];
  return (
    <SymbolView
      name={{ ios, android }}
      size={size}
      tintColor={t.colors[color]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
