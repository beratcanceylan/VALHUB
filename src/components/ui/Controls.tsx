import { forwardRef, useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Platform, Pressable, ScrollView, Switch as RNSwitch, TextInput as RNTextInput, View, type TextInputProps as RNTextInputProps } from "react-native";
import { useTheme } from "@/design/theme";
import { useT } from "@/i18n";
import { Icon } from "./Icon";
import { Text } from "./Text";

const IS_IOS = Platform.OS === "ios";

export interface TextInputProps extends RNTextInputProps {
  label: string;
  error?: string;
  hint?: string;
  hideLabel?: boolean;
}

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput({ label, error, hint, hideLabel, style, ...rest }, ref) {
  const t = useTheme();
  return (
    <View style={{ gap: t.space[1] }}>
      {!hideLabel ? (
        <Text variant="bodySm" weight="medium" color="textSecondary">
          {label}
        </Text>
      ) : null}
      <RNTextInput
        ref={ref}
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        placeholderTextColor={t.colors.textTertiary}
        style={[
          {
            minHeight: t.touchTarget.min,
            paddingHorizontal: t.space[3],
            paddingVertical: t.space[2],
            borderRadius: t.radius.md,
            borderCurve: "continuous",
            borderWidth: t.borderWidth.thin,
            borderColor: error ? t.colors.negative : t.colors.border,
            backgroundColor: t.colors.surface,
            color: t.colors.textPrimary,
            fontSize: t.fontSize.body,
          },
          style,
        ]}
        {...rest}
      />
      {error ? <InlineError message={error} /> : null}
      {!error && hint ? (
        <Text variant="caption" color="textTertiary">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

export function InlineError({ message }: Readonly<{ message: string }>) {
  const t = useTheme();
  return (
    <View accessible accessibilityRole="alert" accessibilityLabel={message} accessibilityLiveRegion="polite" style={{ flexDirection: "row", alignItems: "center", gap: t.space[1] }}>
      <Icon name="alert" size={14} color="negative" />
      <Text variant="caption" color="negative" style={{ flex: 1 }}>
        {message}
      </Text>
    </View>
  );
}

export function SearchInput({
  value,
  onChangeText,
  placeholder,
  label,
  autoFocus,
  onSubmitEditing,
}: Readonly<{
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  label: string;
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
}>) {
  const t = useTheme();
  const { t: tr } = useT();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: t.space[2],
        minHeight: t.touchTarget.min,
        paddingHorizontal: t.space[3],
        borderRadius: t.radius.md,
        borderCurve: "continuous",
        backgroundColor: t.colors.surfaceSunken,
      }}
    >
      <Icon name="search" size={18} color="textTertiary" />
      <RNTextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.colors.textTertiary}
        autoFocus={autoFocus}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        onSubmitEditing={onSubmitEditing}
        style={{ flex: 1, color: t.colors.textPrimary, fontSize: t.fontSize.body, paddingVertical: t.space[2] }}
      />
      {value.length > 0 ? (
        <Pressable accessibilityRole="button" accessibilityLabel={tr("common.clear")} onPress={() => onChangeText("")} hitSlop={10}>
          <Icon name="close" size={16} color="textTertiary" />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Resolves once per app run; motion falls back to instant jumps when Reduce Motion is on. */
let reduceMotion = false;
void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
  reduceMotion = v;
});

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: Readonly<{
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  label: string;
}>) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const segment = options.length > 0 ? (width - 4) / options.length : 0;
  const [x] = useState(() => new Animated.Value(0));
  const placed = useRef(false);

  useEffect(() => {
    if (segment <= 0) return;
    const to = index * segment;
    // First layout places the thumb without animating; later changes slide it.
    if (!placed.current || reduceMotion) {
      x.setValue(to);
      placed.current = true;
      return;
    }
    Animated.spring(x, { toValue: to, useNativeDriver: true, speed: 22, bounciness: 4 }).start();
  }, [index, segment, x]);

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ flexDirection: "row", backgroundColor: t.colors.surfaceSunken, borderRadius: t.radius.md, borderCurve: "continuous", padding: 2 }}
    >
      {segment > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 2,
            bottom: 2,
            left: 2,
            width: segment,
            borderRadius: t.radius.md - 2,
            borderCurve: "continuous",
            backgroundColor: t.colors.surface,
            borderWidth: t.borderWidth.thin,
            borderColor: t.colors.border,
            transform: [{ translateX: x }],
          }}
        />
      ) : null}
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={o.label}
            onPress={() => onChange(o.value)}
            style={{ flex: 1, minHeight: 36, alignItems: "center", justifyContent: "center", paddingHorizontal: t.space[1] }}
          >
            <Text
              variant="bodySm"
              weight={selected ? "semibold" : "medium"}
              color={selected ? "textPrimary" : "textSecondary"}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function FilterChip({ label, selected, onPress }: Readonly<{ label: string; selected: boolean; onPress: () => void }>) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        minHeight: 36,
        paddingHorizontal: t.space[3],
        justifyContent: "center",
        borderRadius: t.radius.sm,
        borderWidth: t.borderWidth.thin,
        // Selected chips invert (solid ink) instead of a tinted fill or a leading check mark.
        borderColor: selected ? t.colors.textPrimary : t.colors.border,
        backgroundColor: selected ? t.colors.textPrimary : t.colors.surface,
        flexDirection: "row",
        alignItems: "center",
        gap: t.space[1],
      }}
    >
      <Text variant="bodySm" weight="medium" color={selected ? "textInverse" : "textPrimary"}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Horizontally scrolling chip row that respects screen gutters. */
export function ChipRow({ children }: Readonly<{ children: ReactNode }>) {
  const t = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: t.space[2], paddingVertical: t.space[1] }}
      style={{ marginHorizontal: -t.space[4] }}
    >
      <View style={{ width: t.space[4] - t.space[2] }} />
      {children}
      <View style={{ width: t.space[4] - t.space[2] }} />
    </ScrollView>
  );
}

export function Tag({ label, tone = "neutral" }: Readonly<{ label: string; tone?: "neutral" | "accent" | "positive" | "negative" | "warning" | "info" }>) {
  const t = useTheme();
  const map = {
    neutral: [t.colors.surfaceSunken, "textSecondary"],
    accent: [t.colors.accentSubtle, "accent"],
    positive: [t.colors.positiveSubtle, "positive"],
    negative: [t.colors.negativeSubtle, "negative"],
    warning: [t.colors.warningSubtle, "warning"],
    info: [t.colors.infoSubtle, "info"],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={{ backgroundColor: bg, borderRadius: t.radius.xs, paddingHorizontal: t.space[2], paddingVertical: 2, alignSelf: "flex-start", maxWidth: "100%" }}>
      <Text variant="caption" weight="semibold" color={fg} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Status marker that never relies on color alone: always text + optional dot. */
export function Badge({ label, tone }: Readonly<{ label: string; tone: "live" | "positive" | "negative" | "neutral" }>) {
  const t = useTheme();
  const color = { live: t.colors.accent, positive: t.colors.positive, negative: t.colors.negative, neutral: t.colors.textTertiary }[tone];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: t.space[1] }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      <Text variant="caption" weight="semibold" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}

/** Settings row with the platform's native switch (UISwitch / Material 3 switch). The whole row toggles. */
export function Switch({ label, description, value, onValueChange, disabled }: Readonly<{ label: string; description?: string; value: boolean; onValueChange: (v: boolean) => void; disabled?: boolean }>) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      accessibilityLabel={label}
      accessibilityHint={description}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={{ flexDirection: "row", alignItems: "center", gap: t.space[3], paddingHorizontal: t.space[4], paddingVertical: t.space[3], minHeight: IS_IOS ? 52 : 56, opacity: disabled ? 0.5 : 1 }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text weight="medium">{label}</Text>
        {description ? (
          <Text variant="bodySm" color="textSecondary">
            {description}
          </Text>
        ) : null}
      </View>
      {/* The row is the accessible control; the native switch is a visual twin. */}
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <RNSwitch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{ false: t.colors.borderStrong, true: t.colors.accent }}
          thumbColor={IS_IOS ? undefined : t.colors.surface}
          ios_backgroundColor={t.colors.borderStrong}
        />
      </View>
    </Pressable>
  );
}
