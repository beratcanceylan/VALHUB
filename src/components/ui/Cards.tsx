import { useCallback, useMemo, useState, type ReactElement, type ReactNode } from "react";
import { FlatList, Pressable, StyleSheet, View, type ListRenderItemInfo, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { Image, type ImageContentFit, type ImageContentPosition } from "expo-image";
import { isAllowedMediaUrl } from "@/data/media-policy";
import { useTheme, type Theme } from "@/design/theme";
import { Icon, type IconName } from "./Icon";
import { Text } from "./Text";

/** Width of one cell in an N-column grid that spans the screen between the standard gutters. */
export function useColumnWidth(columns: number, gap?: number): number {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const g = gap ?? t.space[3];
  // Floored so N cells plus gaps never exceed the row and wrap early.
  return Math.floor((width - t.space[4] * 2 - g * (columns - 1)) / columns);
}

function gradientStop(color: string, position: number): string {
  return `${color} ${Math.round(position * 100)}%`;
}

/** CSS gradient string from top-to-bottom color stops. */
function verticalGradient(colors: readonly string[]): string {
  const last = Math.max(1, colors.length - 1);
  const stops = colors.map((c, i) => gradientStop(c, i / last));
  return `linear-gradient(to bottom, ${stops.join(", ")})`;
}

function scrim(t: Theme, from = 35): string {
  return `linear-gradient(to bottom, ${t.colors.mediaScrimClear} ${from}%, ${t.colors.mediaScrim} 100%)`;
}

/** Full-bleed network image for card backgrounds; renders nothing when the URL is not allowed. */
function Backdrop({ uri, contentFit = "cover", position = "center" }: Readonly<{ uri: string | undefined; contentFit?: ImageContentFit; position?: ImageContentPosition }>) {
  if (!uri || !isAllowedMediaUrl(uri)) return null;
  return (
    <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit={contentFit} contentPosition={position} transition={150} cachePolicy="memory-disk" recyclingKey={uri} />
  );
}

function pressedScale(pressed: boolean) {
  return { transform: [{ scale: pressed ? 0.98 : 1 }] };
}

/** One-line explainer under a large title, as in the design's section intros. */
export function Intro({ children }: Readonly<{ children: string }>) {
  const t = useTheme();
  return (
    <Text variant="bodySm" color="textSecondary" style={{ marginBottom: t.space[4] }}>
      {children}
    </Text>
  );
}

export interface HeroCardProps {
  imageUri: string | undefined;
  title: string;
  eyebrow?: string;
  subtitle?: string;
  actionLabel?: string;
  onPress?: () => void;
  height?: number;
  width?: number;
  /** Gradient stops painted behind the image (e.g. an agent's colors). */
  gradient?: readonly string[];
  contentFit?: ImageContentFit;
  /** Where to anchor a cropped image; `"top center"` keeps faces in portrait art. */
  contentPosition?: ImageContentPosition;
}

/** Large image card with text on a bottom scrim: featured news, bundles, maps, agents. */
export function HeroCard({ imageUri, title, eyebrow, subtitle, actionLabel, onPress, height = 220, width, gradient, contentFit = "cover", contentPosition }: Readonly<HeroCardProps>) {
  const t = useTheme();
  const spoken = [eyebrow, title, subtitle].filter(Boolean).join(", ");
  const body = (
    <View
      style={{
        height,
        width,
        borderRadius: t.radius.lg + 4,
        borderCurve: "continuous",
        overflow: "hidden",
        backgroundColor: t.colors.surfaceRaised,
        experimental_backgroundImage: gradient && gradient.length > 1 ? verticalGradient(gradient) : undefined,
      }}
    >
      <Backdrop uri={imageUri} contentFit={contentFit} {...(contentPosition ? { position: contentPosition } : {})} />
      <View style={[StyleSheet.absoluteFill, { experimental_backgroundImage: scrim(t) }]} />
      <View style={{ flex: 1, justifyContent: "flex-end", padding: t.space[4], gap: t.space[1] }}>
        {eyebrow ? (
          <Text variant="caption" label color="accent" numberOfLines={1}>
            {eyebrow}
          </Text>
        ) : null}
        <Text variant="title" weight="bold" color="onMedia" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySm" color="onMediaSecondary" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        {actionLabel ? (
          <View
            style={{
              alignSelf: "flex-start",
              flexDirection: "row",
              alignItems: "center",
              gap: t.space[1],
              marginTop: t.space[2],
              paddingVertical: t.space[1] + 2,
              paddingLeft: t.space[3],
              paddingRight: t.space[2],
              borderRadius: t.radius.full,
              borderWidth: t.borderWidth.thin,
              borderColor: t.colors.onMediaSecondary,
            }}
          >
            <Text variant="bodySm" weight="semibold" color="onMedia">
              {actionLabel}
            </Text>
            <Icon name="chevronRight" size={16} color="onMedia" />
          </View>
        ) : null}
      </View>
    </View>
  );
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={spoken}>
        {body}
      </View>
    );
  }
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={spoken} onPress={onPress} style={({ pressed }) => pressedScale(pressed)}>
      {body}
    </Pressable>
  );
}

/** Horizontally paged row of full-width cards with page dots. */
export function Carousel<T>({
  data,
  keyExtractor,
  renderItem,
  label,
}: Readonly<{ data: readonly T[]; keyExtractor: (item: T) => string; renderItem: (item: T) => ReactElement; label: string }>) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const pageWidth = width - t.space[4] * 2;
  const interval = pageWidth + t.space[3];
  const [page, setPage] = useState(0);
  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.round(e.nativeEvent.contentOffset.x / interval));
  const pageStyle = useMemo(() => ({ width: pageWidth }), [pageWidth]);
  const renderPage = useCallback(({ item }: ListRenderItemInfo<T>) => <View style={pageStyle}>{renderItem(item)}</View>, [pageStyle, renderItem]);
  return (
    <View accessibilityLabel={label}>
      <FlatList
        horizontal
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderPage}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={interval}
        snapToAlignment="start"
        onMomentumScrollEnd={onEnd}
        style={{ marginHorizontal: -t.space[4] }}
        contentContainerStyle={{ paddingHorizontal: t.space[4], gap: t.space[3] }}
      />
      {data.length > 1 ? (
        <View style={{ flexDirection: "row", justifyContent: "center", gap: t.space[1] + 2, marginTop: t.space[3] }} importantForAccessibility="no-hide-descendants">
          {data.map((item, i) => (
            <View key={keyExtractor(item)} style={{ width: i === page ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === page ? t.colors.accent : t.colors.borderStrong }} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export interface MediaCardProps {
  imageUri: string | undefined;
  title: string;
  subtitle?: string;
  width: number;
  /** Width / height of the whole card. */
  aspectRatio?: number;
  gradient?: readonly string[];
  contentFit?: ImageContentFit;
  contentPosition?: ImageContentPosition;
  selected?: boolean;
  onPress?: () => void;
  /** Rendered in the top-right corner (e.g. a saved heart). */
  corner?: ReactNode;
}

/** Portrait/grid card with the name on a scrim: agents, skins, map picks. */
export function MediaCard({ imageUri, title, subtitle, width, aspectRatio = 0.78, gradient, contentFit = "cover", contentPosition, selected, onPress, corner }: Readonly<MediaCardProps>) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle].filter(Boolean).join(", ")}
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => pressedScale(pressed)}
    >
      <View
        style={{
          width,
          aspectRatio,
          borderRadius: t.radius.lg,
          borderCurve: "continuous",
          overflow: "hidden",
          borderWidth: selected ? t.borderWidth.thick : t.borderWidth.hairline,
          borderColor: selected ? t.colors.accent : t.colors.border,
          backgroundColor: t.colors.surfaceRaised,
          experimental_backgroundImage: gradient && gradient.length > 1 ? verticalGradient(gradient) : undefined,
        }}
      >
        <Backdrop uri={imageUri} contentFit={contentFit} {...(contentPosition ? { position: contentPosition } : {})} />
        <View style={[StyleSheet.absoluteFill, { experimental_backgroundImage: scrim(t, 50) }]} />
        <View style={{ flex: 1, justifyContent: "flex-end", padding: t.space[2] + 2 }}>
          <Text variant="bodySm" weight="bold" color="onMedia" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" color="onMediaSecondary" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {corner ? <View style={{ position: "absolute", top: t.space[2], right: t.space[2] }}>{corner}</View> : null}
      </View>
    </Pressable>
  );
}

/** Product-style card: art on a sunken stage, name and meta below. Weapons, store offers, skins. */
export function ShowcaseCard({
  imageUri,
  title,
  meta,
  width,
  imageAspectRatio = 1.8,
  onPress,
  corner,
}: Readonly<{ imageUri: string | undefined; title: string; meta?: ReactNode; width?: number; imageAspectRatio?: number; onPress?: () => void; corner?: ReactNode }>) {
  const t = useTheme();
  const body = (
    <View
      style={{
        width,
        borderRadius: t.radius.lg,
        borderCurve: "continuous",
        overflow: "hidden",
        backgroundColor: t.colors.surface,
        borderWidth: t.borderWidth.hairline,
        borderColor: t.colors.border,
      }}
    >
      <View style={{ aspectRatio: imageAspectRatio, backgroundColor: t.colors.surfaceSunken, padding: t.space[3] }}>
        <View style={{ flex: 1 }}>
          <Backdrop uri={imageUri} contentFit="contain" />
        </View>
        {corner ? <View style={{ position: "absolute", top: t.space[2], right: t.space[2] }}>{corner}</View> : null}
      </View>
      <View style={{ padding: t.space[3], gap: 2 }}>
        <Text variant="bodySm" weight="semibold" numberOfLines={2}>
          {title}
        </Text>
        {meta}
      </View>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => pressedScale(pressed)}>
      {body}
    </Pressable>
  );
}

/** Square shortcut with an icon and a short label (quick access, "More" hub). */
export function Tile({ icon, label, detail, onPress, width }: Readonly<{ icon: IconName; label: string; detail?: string; onPress: () => void; width: number }>) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[label, detail].filter(Boolean).join(", ")}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width,
          minHeight: detail ? 104 : 88,
          padding: t.space[3],
          gap: t.space[2],
          justifyContent: detail ? "flex-start" : "center",
          alignItems: detail ? "flex-start" : "center",
          borderRadius: t.radius.lg,
          borderCurve: "continuous",
          backgroundColor: pressed ? t.colors.surfaceSunken : t.colors.surface,
          borderWidth: t.borderWidth.hairline,
          borderColor: t.colors.border,
        },
        pressedScale(pressed),
      ]}
    >
      <Icon name={icon} size={24} color="accent" strokeWidth={2} />
      <View style={{ gap: 2, alignSelf: "stretch" }}>
        <Text variant="bodySm" weight="semibold" align={detail ? "left" : "center"} numberOfLines={2}>
          {label}
        </Text>
        {detail ? (
          <Text variant="caption" color="textSecondary" numberOfLines={2}>
            {detail}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Wrapping grid row for fixed-width cells produced by `useColumnWidth`. */
export function Grid({ children, gap }: Readonly<{ children: ReactNode; gap?: number }>) {
  const t = useTheme();
  const g = gap ?? t.space[3];
  return <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: g, rowGap: g }}>{children}</View>;
}
