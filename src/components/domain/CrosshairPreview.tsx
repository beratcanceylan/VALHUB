import { PixelRatio, View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { crosshairColorHex, crosshairGeometry, type CrosshairProfile } from "@valhub/domain";
import { RemoteImage } from "@/components/ui/Media";

const NO_ERROR = { firing: 0, moving: 0 };

/**
 * Pixel-accurate crosshair preview. Geometry comes from the game's own units (1080p pixels)
 * magnified by `zoom` and snapped to the device pixel grid. Crosshair and
 * backdrop colors are user content, not UI colors, so they come from the profile.
 */
export function CrosshairPreview({
  profile,
  size = 160,
  height = size,
  zoom,
  background = "#3A3F46",
  backgroundUri,
  error = NO_ERROR,
  label,
}: Readonly<{
  profile: CrosshairProfile;
  /** Width in points (and height, unless `height` is given). */
  size?: number;
  height?: number;
  /** Screen points per game pixel. Defaults to fitting a 64 px window. */
  zoom?: number;
  background?: string;
  /** Optional scene image (e.g. a map splash) drawn behind the crosshair. */
  backgroundUri?: string;
  /** 0–1 firing / movement error to visualise spread. */
  error?: { firing: number; moving: number };
  label: string;
}>) {
  const scale = zoom ?? size / 64;
  const cx = size / 2;
  const cy = height / 2;
  const color = crosshairColorHex(profile);
  const ot = profile.outlines ? profile.outlineThickness : 0;
  const rects = crosshairGeometry(profile, error);
  // Snap to the device pixel grid so edges stay crisp like the game's.
  const snap = (v: number) => PixelRatio.roundToNearestPixel(v);
  const px = (v: number) => snap(cx + v * scale);
  const py = (v: number) => snap(cy + v * scale);
  const len = (v: number) => snap(v * scale);

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ width: size, height, backgroundColor: background }}>
      {backgroundUri ? (
        <View style={{ position: "absolute", inset: 0 }}>
          <RemoteImage uri={backgroundUri} width={size} height={height} contentFit="cover" radius={0} />
        </View>
      ) : null}
      <Svg width={size} height={height} style={{ position: "absolute" }}>
        {ot > 0
          ? rects.map((r) => (
              <Rect
                key={`o-${r.layer}-${r.side}`}
                x={px(r.x - ot)}
                y={py(r.y - ot)}
                width={len(r.w + ot * 2)}
                height={len(r.h + ot * 2)}
                fill="#000000"
                opacity={profile.outlineOpacity * r.opacity}
              />
            ))
          : null}
        {rects.map((r) => (
          <Rect key={`${r.layer}-${r.side}`} x={px(r.x)} y={py(r.y)} width={len(r.w)} height={len(r.h)} fill={color} opacity={r.opacity} />
        ))}
      </Svg>
    </View>
  );
}
