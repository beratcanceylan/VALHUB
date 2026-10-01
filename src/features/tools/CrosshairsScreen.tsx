import { useCallback, useState } from "react";
import { Animated, Pressable, View, useWindowDimensions } from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { parseCrosshairCode, type CrosshairProfile } from "@valhub/domain";
import type { CrosshairPresetRecord } from "@valhub/core";
import { CrosshairPreview } from "@/components/domain/CrosshairPreview";
import { Button, EmptyState, IconButton, ListRow, QueryView, RowGroup, Screen, SectionHeader, Surface, Tag, Text } from "@/components/ui";
import { useCrosshairPresets } from "@/data/queries";
import { savedCrosshairs, type SavedCrosshair } from "@/data/repositories/library";
import { useTheme } from "@/design/theme";
import { useT } from "@/i18n";
import { presetName, presetTag } from "@/lib/presets";

/** Preview backdrop for cards: a mid-grey game surface (tool content, not UI chrome). */
const CARD_SCENE = "#6B7078";

function profileOf(code: string): CrosshairProfile | undefined {
  try {
    return parseCrosshairCode(code).primary;
  } catch {
    return undefined;
  }
}

function Thumb({ code, label }: Readonly<{ code: string; label: string }>) {
  const t = useTheme();
  const profile = profileOf(code);
  if (!profile) return <View style={{ width: 44, height: 44 }} />;
  return (
    <View style={{ borderRadius: t.radius.sm, borderCurve: "continuous", overflow: "hidden" }}>
      <CrosshairPreview profile={profile} size={44} zoom={1.5} background={CARD_SCENE} label={label} />
    </View>
  );
}

/** Pressable card that dips slightly under the finger. */
function PresetCard({ preset, width }: Readonly<{ preset: CrosshairPresetRecord; width: number }>) {
  const t = useTheme();
  const { t: tr } = useT();
  const [press] = useState(() => new Animated.Value(0));
  const profile = profileOf(preset.code);
  const name = presetName(tr, preset);
  const spring = (toValue: number) => Animated.spring(press, { toValue, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityHint={tr("crosshair.open")}
      onPressIn={() => spring(1)}
      onPressOut={() => spring(0)}
      onPress={() =>
        router.push({ pathname: "/crosshairs/editor", params: { code: preset.code, name } })
      }
    >
      <Animated.View
        style={{
          width,
          borderRadius: t.radius.md,
          borderCurve: "continuous",
          overflow: "hidden",
          borderWidth: t.borderWidth.hairline,
          borderColor: t.colors.border,
          backgroundColor: t.colors.surface,
          transform: [{ scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] }) }],
        }}
      >
        {profile ? <CrosshairPreview profile={profile} size={width} height={96} zoom={3} background={CARD_SCENE} label={name} /> : <View style={{ height: 96 }} />}
        <View style={{ padding: t.space[3], gap: 2 }}>
          <Text variant="bodySm" weight="semibold" numberOfLines={1}>
            {name}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.space[1], marginTop: 2 }}>
            {preset.tags.map((tag) => (
              <Tag key={tag} label={presetTag(tr, tag)} />
            ))}
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

function BuilderHero() {
  const t = useTheme();
  const { t: tr } = useT();
  const sample = profileOf("0;P;c;1;h;0;0l;4;0o;2;0a;1;0f;0;1b;0");
  return (
    <Surface padded style={{ flexDirection: "row", alignItems: "center", gap: t.space[4] }}>
      <View style={{ flex: 1, gap: t.space[2] }}>
        <Text variant="titleSm" weight="bold">
          {tr("crosshair.title")}
        </Text>
        <Button label={tr("crosshair.create")} icon="plus" size="sm" style={{ alignSelf: "flex-start", marginTop: t.space[1] }} onPress={() => router.push("/crosshairs/editor")} />
      </View>
      {sample ? (
        <View style={{ borderRadius: t.radius.md, borderCurve: "continuous", overflow: "hidden" }}>
          <CrosshairPreview profile={sample} size={88} zoom={4} background={CARD_SCENE} label={tr("crosshair.previewLabel")} />
        </View>
      ) : null}
    </Surface>
  );
}

export default function CrosshairsScreen() {
  const t = useTheme();
  const { t: tr } = useT();
  const { width: screen } = useWindowDimensions();
  // Floored so two cards plus the gap never exceed the row and wrap into one column.
  const cardWidth = Math.floor((screen - t.space[4] * 2 - t.space[3]) / 2);
  const presets = useCrosshairPresets();
  const [saved, setSaved] = useState<SavedCrosshair[]>([]);
  useFocusEffect(useCallback(() => setSaved(savedCrosshairs.list()), []));

  return (
    <Screen>
      <Stack.Screen options={{ title: tr("library.crosshairs") }} />
      <BuilderHero />

      <SectionHeader title={tr("crosshair.presets")} />
      <QueryView query={presets} compactError>
        {(list) => (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.space[3] }}>
            {list.map((p) => (
              <PresetCard key={p.id} preset={p} width={cardWidth} />
            ))}
          </View>
        )}
      </QueryView>

      <SectionHeader title={tr("crosshair.saved")} />
      {saved.length === 0 ? (
        <Surface>
          <EmptyState icon="crosshair" title={tr("library.empty")} message={tr("crosshair.savedEmpty")} />
        </Surface>
      ) : (
        <RowGroup>
          {saved.map((c) => (
            <ListRow
              key={c.id}
              title={c.name}
              subtitle={c.code}
              leading={<Thumb code={c.code} label={c.name} />}
              trailing={
                <IconButton
                  icon="trash"
                  label={`${tr("common.delete")} ${c.name}`}
                  color="textTertiary"
                  onPress={() => {
                    savedCrosshairs.remove(c.id);
                    setSaved(savedCrosshairs.list());
                  }}
                />
              }
              onPress={() => router.push({ pathname: "/crosshairs/editor", params: { id: c.id } })}
            />
          ))}
        </RowGroup>
      )}
    </Screen>
  );
}
