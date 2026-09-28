import { View } from "react-native";
import { sniperValue, type CrosshairSettings, type SniperSettings } from "@valhub/domain";
import { SectionHeader, Slider, Surface } from "@/components/ui";
import { useT } from "@/i18n";
import { ColorField } from "./ColorField";

/** Sniper-scope center dot. Only values the user touches are written into the code. */
export function SniperEditor({ settings, onChange }: Readonly<{ settings: CrosshairSettings; onChange: (s: CrosshairSettings) => void }>) {
  const { t: tr } = useT();
  const set = (patch: Partial<SniperSettings>) => onChange({ ...settings, sniper: { ...settings.sniper, ...patch } });
  return (
    <View>
      <SectionHeader title={tr("crosshair.color")} />
      <ColorField
        colorIndex={sniperValue(settings, "colorIndex")}
        customColor={settings.sniper?.customColor}
        onChange={({ colorIndex, customColor }) => set({ colorIndex, ...(customColor ? { customColor } : {}) })}
      />
      <SectionHeader title={tr("crosshair.centerDot")} />
      <Surface>
        <Slider label={tr("crosshair.centerDotOpacity")} value={sniperValue(settings, "opacity")} min={0} max={1} step={0.05} digits={2} onChange={(opacity) => set({ opacity })} />
        <Slider label={tr("crosshair.centerDotThickness")} value={sniperValue(settings, "thickness")} min={0} max={4} step={0.1} digits={1} onChange={(thickness) => set({ thickness })} />
      </Surface>
    </View>
  );
}
