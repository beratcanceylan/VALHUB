import { ActivityIndicator, Pressable, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme, type Theme } from "@/design/theme";
import { Icon, type IconName } from "./Icon";
import { Text } from "./Text";

type Variant = "primary" | "secondary" | "ghost" | "destructive";

const FOREGROUND = { primary: "onAccent", secondary: "textPrimary", ghost: "textPrimary", destructive: "negative" } as const;

function buttonOpacity(disabled: boolean, pressed: boolean, variant: Variant): number {
  if (disabled) return 0.5;
  return pressed && variant !== "primary" ? 0.7 : 1;
}

function iconButtonBackground(t: Theme, selected: boolean | undefined, pressed: boolean): string {
  if (selected) return t.colors.accentSubtle;
  return pressed ? t.colors.surfaceSunken : "transparent";
}

export interface ButtonProps extends Omit<PressableProps, "style" | "children"> {
  label: string;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  size?: "md" | "sm";
  style?: StyleProp<ViewStyle>;
  /** Light haptic on confirmations (save, copy). Off for navigation. */
  haptic?: boolean;
}

export function Button({ label, variant = "primary", icon, loading, size = "md", disabled, style, haptic, onPress, ...rest }: Readonly<ButtonProps>) {
  const t = useTheme();
  const bg: Record<Variant, string> = {
    primary: t.colors.accent,
    secondary: t.colors.surface,
    ghost: "transparent",
    destructive: t.colors.negativeSubtle,
  };
  const fg = FOREGROUND[variant];
  const isDisabled = !!(disabled || loading);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={isDisabled}
      onPress={(e) => {
        if (haptic) void Haptics.selectionAsync();
        onPress?.(e);
      }}
      style={({ pressed }) => [
        {
          minHeight: size === "md" ? t.touchTarget.min + 6 : 36,
          paddingHorizontal: size === "md" ? t.space[5] : t.space[4],
          paddingVertical: t.space[2],
          // Capsule buttons: iOS 26 bordered/prominent style and Material 3 common buttons.
          borderRadius: t.radius.full,
          borderCurve: "continuous",
          backgroundColor: pressed && variant === "primary" ? t.colors.accentPressed : bg[variant],
          borderWidth: variant === "secondary" ? t.borderWidth.thin : 0,
          borderColor: t.colors.border,
          opacity: buttonOpacity(isDisabled, pressed, variant),
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
      {...rest}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: t.space[2], maxWidth: "100%" }}>
        {loading ? <ActivityIndicator color={t.colors[fg]} size="small" /> : null}
        {!loading && icon ? <Icon name={icon} size={18} color={fg} /> : null}
        <Text variant={size === "md" ? "body" : "bodySm"} weight="semibold" color={fg} align="center" numberOfLines={2} style={{ flexShrink: 1 }}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  color = "textPrimary",
  size = 22,
  disabled,
  selected,
  box,
}: Readonly<{
  icon: IconName;
  /** Required: icon-only controls must have an accessible name. */
  label: string;
  onPress?: () => void;
  color?: NonNullable<Parameters<typeof Icon>[0]["color"]>;
  size?: number;
  disabled?: boolean;
  selected?: boolean;
  /** Square hit box; defaults to the 44 pt minimum touch target. */
  box?: number;
}>) {
  const t = useTheme();
  const side = box ?? t.touchTarget.min;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, selected: !!selected }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        width: side,
        height: side,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: t.radius.full,
        backgroundColor: iconButtonBackground(t, selected, pressed),
        opacity: disabled ? 0.4 : 1,
      })}
    >
      <Icon name={icon} size={size} color={selected ? "accent" : color} />
    </Pressable>
  );
}
