import type { ReactNode } from "react";
import { View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import type { CrosshairLineSettings, CrosshairProfile } from "@valhub/domain";
import { Divider, SectionHeader, Slider, Surface, Switch } from "@/components/ui";
import { useT } from "@/i18n";
import { ColorField } from "./ColorField";

/** Settings that only apply when their toggle is on slide in and out instead of popping. */
function Reveal({ when, children }: Readonly<{ when: boolean; children: ReactNode }>) {
  if (!when) return null;
  return (
    <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)} layout={LinearTransition.duration(180)}>
      {children}
    </Animated.View>
  );
}

function LineSection({ title, line, onChange }: Readonly<{ title: string; line: CrosshairLineSettings; onChange: (l: CrosshairLineSettings) => void }>) {
  const { t } = useT();
  const set = (patch: Partial<CrosshairLineSettings>) => onChange({ ...line, ...patch });
  return (
    <>
      <SectionHeader title={title} />
      <Surface>
        <Switch label={t("crosshair.show")} value={line.show} onValueChange={(show) => set({ show })} />
        <Reveal when={line.show}>
          <Divider inset={16} />
          <Slider label={t("crosshair.opacity")} value={line.opacity} min={0} max={1} step={0.05} digits={2} onChange={(opacity) => set({ opacity })} />
          <Slider label={t("crosshair.length")} value={line.length} min={0} max={20} step={1} onChange={(length) => set({ length })} />
          <Switch label={t("crosshair.separateVertical")} value={line.separateVertical} onValueChange={(separateVertical) => set({ separateVertical })} />
          <Reveal when={line.separateVertical}>
            <Slider label={t("crosshair.verticalLength")} value={line.verticalLength} min={0} max={20} step={1} onChange={(verticalLength) => set({ verticalLength })} />
          </Reveal>
          <Slider label={t("crosshair.thickness")} value={line.thickness} min={0} max={10} step={1} onChange={(thickness) => set({ thickness })} />
          <Slider label={t("crosshair.offset")} value={line.offset} min={0} max={40} step={1} onChange={(offset) => set({ offset })} />
          <Divider inset={16} />
          <Switch label={t("crosshair.movementError")} value={line.movementError} onValueChange={(movementError) => set({ movementError })} />
          <Reveal when={line.movementError}>
            <Slider label={t("crosshair.movementMultiplier")} value={line.movementErrorMultiplier} min={0} max={3} step={0.1} digits={1} onChange={(movementErrorMultiplier) => set({ movementErrorMultiplier })} />
          </Reveal>
          <Switch label={t("crosshair.firingError")} value={line.firingError} onValueChange={(firingError) => set({ firingError })} />
          <Reveal when={line.firingError}>
            <Slider label={t("crosshair.firingMultiplier")} value={line.firingErrorMultiplier} min={0} max={3} step={0.1} digits={1} onChange={(firingErrorMultiplier) => set({ firingErrorMultiplier })} />
          </Reveal>
        </Reveal>
      </Surface>
    </>
  );
}

/** Every setting of one crosshair profile, in the same order as the game's settings screen. */
export function ProfileEditor({ profile, onChange }: Readonly<{ profile: CrosshairProfile; onChange: (p: CrosshairProfile) => void }>) {
  const { t } = useT();
  const set = (patch: Partial<CrosshairProfile>) => onChange({ ...profile, ...patch });
  return (
    <View>
      <SectionHeader title={t("crosshair.color")} />
      <ColorField
        colorIndex={profile.colorIndex}
        customColor={profile.customColor}
        onChange={({ colorIndex, customColor }) => set({ colorIndex, ...(customColor ? { customColor } : {}) })}
      />

      <SectionHeader title={t("crosshair.outlines")} />
      <Surface>
        <Switch label={t("crosshair.outlines")} value={profile.outlines} onValueChange={(outlines) => set({ outlines })} />
        <Reveal when={profile.outlines}>
          <Divider inset={16} />
          <Slider label={t("crosshair.outlineOpacity")} value={profile.outlineOpacity} min={0} max={1} step={0.05} digits={2} onChange={(outlineOpacity) => set({ outlineOpacity })} />
          <Slider label={t("crosshair.outlineThickness")} value={profile.outlineThickness} min={1} max={6} step={1} onChange={(outlineThickness) => set({ outlineThickness })} />
        </Reveal>
      </Surface>

      <SectionHeader title={t("crosshair.centerDot")} />
      <Surface>
        <Switch label={t("crosshair.centerDot")} value={profile.centerDot} onValueChange={(centerDot) => set({ centerDot })} />
        <Reveal when={profile.centerDot}>
          <Divider inset={16} />
          <Slider label={t("crosshair.centerDotOpacity")} value={profile.centerDotOpacity} min={0} max={1} step={0.05} digits={2} onChange={(centerDotOpacity) => set({ centerDotOpacity })} />
          <Slider label={t("crosshair.centerDotThickness")} value={profile.centerDotThickness} min={1} max={6} step={1} onChange={(centerDotThickness) => set({ centerDotThickness })} />
        </Reveal>
      </Surface>

      <LineSection title={t("crosshair.inner")} line={profile.inner} onChange={(inner) => set({ inner })} />
      <LineSection title={t("crosshair.outer")} line={profile.outer} onChange={(outer) => set({ outer })} />
    </View>
  );
}
