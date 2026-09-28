import { useEffect, useState } from "react";
import { Animated, Pressable, View } from "react-native";
import { CROSSHAIR_PRESET_COLORS, CUSTOM_COLOR_INDEX, normalizeCrosshairHex } from "@valhub/domain";
import { Text, TextInput } from "@/components/ui";
import { useTheme } from "@/design/theme";
import { useT } from "@/i18n";

const SWATCH = 40;

function Swatch({ color, selected, label, onPress }: Readonly<{ color: string; selected: boolean; label: string; onPress: () => void }>) {
  const t = useTheme();
  const [scale] = useState(() => new Animated.Value(selected ? 1 : 0));
  useEffect(() => {
    Animated.spring(scale, { toValue: selected ? 1 : 0, useNativeDriver: true, speed: 24, bounciness: 10 }).start();
  }, [selected, scale]);
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={label} onPress={onPress} hitSlop={4}>
      <View style={{ width: SWATCH + 8, height: SWATCH + 8, alignItems: "center", justifyContent: "center" }}>
        {/* Selection ring grows in with a spring; the swatch itself never moves. */}
        <Animated.View
          style={{
            position: "absolute",
            width: SWATCH + 8,
            height: SWATCH + 8,
            borderRadius: t.radius.md,
            borderWidth: t.borderWidth.thick,
            borderColor: t.colors.textPrimary,
            opacity: scale,
            transform: [{ scale: scale.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
          }}
        />
        <View style={{ width: SWATCH, height: SWATCH, borderRadius: t.radius.sm, backgroundColor: color, borderWidth: t.borderWidth.hairline, borderColor: t.colors.borderStrong }} />
      </View>
    </Pressable>
  );
}

/** The game's eight preset colors plus a custom hex color (index 8). */
export function ColorField({
  colorIndex,
  customColor,
  onChange,
}: Readonly<{
  colorIndex: number;
  customColor: string | undefined;
  onChange: (next: { colorIndex: number; customColor?: string }) => void;
}>) {
  const t = useTheme();
  const { t: tr } = useT();
  const [hex, setHex] = useState(customColor ?? "");
  const valid = normalizeCrosshairHex(hex);
  const isCustom = colorIndex === CUSTOM_COLOR_INDEX;

  return (
    <View style={{ gap: t.space[3] }}>
      <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: t.space[1] }}>
        {CROSSHAIR_PRESET_COLORS.map((c) => (
          <Swatch key={c.index} color={c.hex} selected={colorIndex === c.index} label={tr(`crosshair.colors.${c.name}`)} onPress={() => onChange({ colorIndex: c.index })} />
        ))}
        <Swatch
          color={customColor ? `#${customColor}` : t.colors.surfaceSunken}
          selected={isCustom}
          label={tr("crosshair.colors.custom")}
          onPress={() => onChange({ colorIndex: CUSTOM_COLOR_INDEX, customColor: valid ?? customColor ?? "FFFFFF" })}
        />
      </View>
      {isCustom ? (
        <View style={{ gap: t.space[1] }}>
          <TextInput
            label={tr("crosshair.customHex")}
            value={hex}
            onChangeText={(v) => {
              setHex(v);
              const next = normalizeCrosshairHex(v);
              if (next) onChange({ colorIndex: CUSTOM_COLOR_INDEX, customColor: next });
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={9}
            hint={tr("crosshair.customHexHint")}
            error={hex && !valid ? tr("crosshair.invalidHex") : undefined}
          />
          {valid ? (
            <Text variant="caption" color="textTertiary" numeric>
              #{valid}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
