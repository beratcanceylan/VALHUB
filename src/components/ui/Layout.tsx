import { Children, isValidElement, type ReactNode } from "react";
import { Platform, Pressable, RefreshControl, ScrollView, View, type ScrollViewProps, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/design/theme";
import { Icon, type IconName } from "./Icon";
import { Text } from "./Text";

const IS_IOS = Platform.OS === "ios";

/**
 * Scrollable screen body with consistent gutters and optional pull-to-refresh. On iOS the scroll
 * view adjusts itself for translucent headers, the tab bar and the home indicator.
 */
export function Screen({
  children,
  refreshing,
  onRefresh,
  padded = true,
  ...rest
}: Readonly<ScrollViewProps & { children: ReactNode; refreshing?: boolean; onRefresh?: () => void; padded?: boolean }>) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const contentStyle = padded ? { paddingHorizontal: t.space[4], paddingTop: t.space[2] } : { paddingTop: t.space[2] };
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.colors.background }}
      contentContainerStyle={contentStyle}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={t.colors.textSecondary} /> : undefined}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      {...rest}
    >
      {children}
      {/* Spacer instead of dynamic bottom padding; iOS already insets for the home indicator. */}
      <View style={{ height: (IS_IOS ? 0 : insets.bottom) + t.space[8] }} />
    </ScrollView>
  );
}

/** Footer for FlashList/FlatList screens so the last row clears the home indicator / navigation bar. */
export function ListBottomSpacer() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return <View style={{ height: (IS_IOS ? 0 : insets.bottom) + t.space[6] }} />;
}

export function Divider({ inset = 0 }: Readonly<{ inset?: number }>) {
  const t = useTheme();
  return <View style={{ height: t.borderWidth.hairline, backgroundColor: t.colors.divider, marginLeft: inset }} />;
}

/** Flat grouped surface with a border. Not a universal card: use for grouped lists and tool panels. */
export function Surface({ children, style, padded = false }: Readonly<{ children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }>) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: t.colors.surface,
          borderRadius: IS_IOS ? t.radius.lg : t.radius.md,
          borderCurve: "continuous",
          // iOS grouped lists use a hairline edge; Android keeps a thin outline for separation.
          borderWidth: IS_IOS ? t.borderWidth.hairline : t.borderWidth.thin,
          borderColor: t.colors.border,
          overflow: "hidden",
          padding: padded ? t.space[4] : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionHeader({ title, actionLabel, onAction, trailing }: Readonly<{ title: string; actionLabel?: string; onAction?: () => void; trailing?: ReactNode }>) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: t.space[3],
        marginTop: t.space[6],
        marginBottom: t.space[2],
        // iOS aligns grouped-section headers with the row text inside the card.
        paddingHorizontal: IS_IOS ? t.space[4] : 0,
      }}
    >
      <Text label variant="caption" color="textSecondary" accessibilityRole="header" style={{ flexShrink: 1 }}>
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction} hitSlop={10}>
          <Text variant="bodySm" color="accent" weight="semibold">
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
      {trailing}
    </View>
  );
}

export interface ListRowProps {
  title: string;
  subtitle?: string;
  meta?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  icon?: IconName;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  chevron?: boolean;
}

export function ListRow({ title, subtitle, meta, leading, trailing, icon, onPress, accessibilityLabel, accessibilityHint, chevron = !!onPress }: Readonly<ListRowProps>) {
  const t = useTheme();
  const content = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: t.space[3], paddingHorizontal: t.space[4], paddingVertical: t.space[3], minHeight: IS_IOS ? 52 : 56 }}>
      {leading ?? (icon ? <Icon name={icon} color="textSecondary" /> : null)}
      <View style={{ flex: 1, gap: 2 }}>
        <Text weight="medium" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySm" color="textSecondary" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {meta ? (
        <Text variant="bodySm" color="textTertiary" numeric numberOfLines={1} style={{ maxWidth: "45%" }}>
          {meta}
        </Text>
      ) : null}
      {trailing}
      {chevron ? <Icon name="chevronRight" size={18} color="textTertiary" /> : null}
    </View>
  );
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={accessibilityLabel ?? [title, subtitle, meta].filter(Boolean).join(", ")}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? [title, subtitle, meta].filter(Boolean).join(", ")}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => ({ backgroundColor: pressed ? t.colors.surfaceSunken : "transparent" })}
    >
      {content}
    </Pressable>
  );
}

/** Renders rows inside a Surface with hairline dividers between them. */
export function RowGroup({ children }: Readonly<{ children: ReactNode[] | ReactNode }>) {
  // Children.toArray drops empty children and gives each one a stable key derived from its own key.
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <Surface>
      {items.map((child) => (
        <View key={child.key}>
          {child !== items[0] ? <Divider inset={16} /> : null}
          {child}
        </View>
      ))}
    </Surface>
  );
}

export function Row({ children, gap = 2, style }: Readonly<{ children: ReactNode; gap?: 1 | 2 | 3 | 4; style?: StyleProp<ViewStyle> }>) {
  const t = useTheme();
  return <View style={[{ flexDirection: "row", alignItems: "center", gap: t.space[gap] }, style]}>{children}</View>;
}
