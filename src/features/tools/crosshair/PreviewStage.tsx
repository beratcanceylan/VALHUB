import { useEffect, useRef, useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Rect } from "react-native-svg";
import { sniperColorHex, sniperValue, type CrosshairProfile, type CrosshairSettings } from "@valhub/domain";
import { CrosshairPreview } from "@/components/domain/CrosshairPreview";
import { ChipRow, FilterChip, SegmentedControl, Text } from "@/components/ui";
import { useMap, useMaps } from "@/data/queries";
import { useTheme } from "@/design/theme";
import { useT } from "@/i18n";

type Scene = "dark" | "mid" | "light" | "map";
type Zoom = "2" | "4" | "8";
/** Scene colors approximate in-game surfaces; they are tool content, not UI chrome. */
const SCENE: Record<Exclude<Scene, "map">, string> = { dark: "#1E2328", mid: "#6B7078", light: "#D9D4C7" };
const STAGE_HEIGHT = 220;

const easeOut = (x: number) => 1 - (1 - x) ** 3;
const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);

/** 0→1 while held, eased back to 0 on release: drives the error-spread simulation. */
function useHold(): [number, { onPressIn: () => void; onPressOut: () => void }] {
  const [held, setHeld] = useState(false);
  const [level, setLevel] = useState(0);
  const levelRef = useRef(0);
  useEffect(() => {
    const from = levelRef.current;
    const to = held ? 1 : 0;
    const duration = held ? 160 : 380;
    const ease = held ? easeOut : easeInOut;
    const start = Date.now();
    let frame = 0;
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / duration);
      levelRef.current = from + (to - from) * ease(p);
      setLevel(levelRef.current);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [held]);
  return [level, { onPressIn: () => setHeld(true), onPressOut: () => setHeld(false) }];
}

function HoldButton({ label, handlers, level }: Readonly<{ label: string; handlers: ReturnType<typeof useHold>[1]; level: number }>) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      {...handlers}
      style={{
        flex: 1,
        minHeight: t.touchTarget.min,
        paddingHorizontal: t.space[2],
        borderRadius: t.radius.md,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: t.borderWidth.thin,
        borderColor: level > 0.05 ? t.colors.accent : t.colors.border,
        backgroundColor: level > 0.05 ? t.colors.accentSubtle : t.colors.surface,
      }}
    >
      <Text variant="bodySm" weight="medium" color={level > 0.05 ? "accent" : "textPrimary"} align="center" numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Scope view: dark vignette, thin reticle ring and the sniper center dot. */
function ScopePreview({ settings, width, height }: Readonly<{ settings: CrosshairSettings; width: number; height: number }>) {
  const { t: tr } = useT();
  const r = Math.min(width, height) / 2 - 12;
  const dot = Math.max(2, sniperValue(settings, "thickness") * 4);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={tr("crosshair.profiles.sniper")} style={{ width, height, backgroundColor: "#0B0D0F" }}>
      <Svg width={width} height={height}>
        <Circle cx={width / 2} cy={height / 2} r={r} fill="#6B7078" />
        <Circle cx={width / 2} cy={height / 2} r={r} fill="none" stroke="#000000" strokeWidth={3} opacity={0.6} />
        <Rect x={width / 2 - r} y={height / 2 - 0.5} width={r * 2} height={1} fill="#000000" opacity={0.35} />
        <Rect x={width / 2 - 0.5} y={height / 2 - r} width={1} height={r * 2} fill="#000000" opacity={0.35} />
        <Circle cx={width / 2} cy={height / 2} r={dot / 2} fill={sniperColorHex(settings)} opacity={sniperValue(settings, "opacity")} />
      </Svg>
    </View>
  );
}

/**
 * The live preview "stage": scene backdrop (solid tones or a real map splash), zoom in game
 * pixels, and press-and-hold buttons that visualise movement and firing error.
 */
export function PreviewStage({ profile, settings, sniper }: Readonly<{ profile: CrosshairProfile; settings: CrosshairSettings; sniper: boolean }>) {
  const t = useTheme();
  const { t: tr } = useT();
  const { width: screen } = useWindowDimensions();
  // Inside the bordered frame: subtract the gutters and both border edges so nothing is clipped.
  const width = screen - t.space[4] * 2 - t.borderWidth.thin * 2;
  const [scene, setScene] = useState<Scene>("mid");
  const [zoom, setZoom] = useState<Zoom>("4");
  const maps = useMaps();
  const standard = (maps.data ?? []).filter((m) => m.isStandard);
  const [mapId, setMapId] = useState<string | undefined>(undefined);
  const activeMapId = mapId ?? standard[0]?.id;
  const map = useMap(scene === "map" && activeMapId ? activeMapId : "");
  const [firing, fireHandlers] = useHold();
  const [moving, moveHandlers] = useHold();

  return (
    <View style={{ gap: t.space[3] }}>
      <View style={{ borderRadius: t.radius.lg, borderCurve: "continuous", overflow: "hidden", borderWidth: t.borderWidth.thin, borderColor: t.colors.border }}>
        {sniper ? (
          <ScopePreview settings={settings} width={width} height={STAGE_HEIGHT} />
        ) : (
          <CrosshairPreview
            profile={profile}
            size={width}
            height={STAGE_HEIGHT}
            zoom={Number(zoom)}
            background={scene === "map" ? SCENE.dark : SCENE[scene]}
            backgroundUri={scene === "map" ? map.data?.overviewImageUrl : undefined}
            error={{ firing, moving }}
            label={tr("crosshair.previewLabel")}
          />
        )}
      </View>

      {sniper ? null : (
        <>
          <View style={{ flexDirection: "row", gap: t.space[2] }}>
            <HoldButton label={tr("crosshair.holdMove")} handlers={moveHandlers} level={moving} />
            <HoldButton label={tr("crosshair.holdFire")} handlers={fireHandlers} level={firing} />
          </View>
          {/* Stacked, not side by side: four scene labels need the full width on a phone. */}
          <View style={{ gap: t.space[2] }}>
            <View>
              <SegmentedControl
                label={tr("crosshair.stage")}
                value={scene}
                onChange={setScene}
                options={[
                  { value: "dark", label: tr("crosshair.bg.dark") },
                  { value: "mid", label: tr("crosshair.bg.mid") },
                  { value: "light", label: tr("crosshair.bg.light") },
                  { value: "map", label: tr("crosshair.mapScene") },
                ]}
              />
            </View>
            <View>
              <SegmentedControl
                label={tr("crosshair.zoom")}
                value={zoom}
                onChange={setZoom}
                options={(["2", "4", "8"] as const).map((z) => ({ value: z, label: `${z}×` }))}
              />
            </View>
          </View>
          {scene === "map" && standard.length > 0 ? (
            <ChipRow>
              {standard.map((m) => (
                <FilterChip key={m.id} label={m.name} selected={m.id === activeMapId} onPress={() => setMapId(m.id)} />
              ))}
            </ChipRow>
          ) : null}
        </>
      )}
    </View>
  );
}
