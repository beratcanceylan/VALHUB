import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Bell,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Clipboard,
  Clock,
  Copy,
  Crosshair,
  ExternalLink,
  Eraser,
  Gauge,
  House,
  Layers,
  LineChart,
  Map as MapIcon,
  MapPin,
  MousePointer2,
  Pencil,
  Play,
  Plus,
  Redo2,
  RefreshCw,
  Search,
  Settings,
  Share2,
  SlidersHorizontal,
  Square,
  Swords,
  Timer,
  Trash2,
  Type,
  Undo2,
  User,
  WifiOff,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react-native";
import type { ColorToken } from "@valhub/design-tokens";
import { useTheme } from "@/design/theme";

/** The app's single icon vocabulary (Lucide, ISC). Screens refer to names, not components. */
const ICONS = {
  home: House,
  performance: LineChart,
  learn: BookOpen,
  library: Bookmark,
  saved: BookmarkCheck,
  search: Search,
  settings: Settings,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  back: ArrowLeft,
  close: X,
  check: Check,
  play: Play,
  plus: Plus,
  trash: Trash2,
  copy: Copy,
  paste: Clipboard,
  share: Share2,
  filter: SlidersHorizontal,
  refresh: RefreshCw,
  external: ExternalLink,
  arrow: ArrowUpRight,
  alert: AlertTriangle,
  offline: WifiOff,
  clock: Clock,
  timer: Timer,
  bell: Bell,
  user: User,
  crosshair: Crosshair,
  gauge: Gauge,
  zap: Zap,
  map: MapIcon,
  pin: MapPin,
  layers: Layers,
  swords: Swords,
  pencil: Pencil,
  undo: Undo2,
  redo: Redo2,
  eraser: Eraser,
  text: Type,
  select: MousePointer2,
  area: Square,
  dot: Circle,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export interface IconProps {
  name: IconName;
  size?: number;
  color?: ColorToken;
  strokeWidth?: number;
}

export function Icon({ name, size = 20, color = "textPrimary", strokeWidth = 1.75 }: Readonly<IconProps>) {
  const t = useTheme();
  const Component = ICONS[name];
  return <Component size={size} color={t.colors[color]} strokeWidth={strokeWidth} accessibilityElementsHidden importantForAccessibility="no" />;
}
