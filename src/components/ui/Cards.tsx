import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Image, type ImageContentFit, type ImageContentPosition } from "expo-image";
import { isAllowedMediaUrl } from "@/data/media-policy";
import { useTheme, type Theme } from "@/design/theme";
import { Text } from "./Text";

/** Width of one cell in an N-column grid that spans the screen between the standard gutters. */
export function useColumnWidth(columns: number, gap?: number): number {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const g = gap ?? t.space[3];
  // Floored so N cells plus gaps never exceed the row and wrap early.
  return Math.floor((width - t.space[4] * 2 - g * (columns - 1)) / columns);
}

/** One corner radius for every media card, so a screen of them reads as one set. */
function cardRadius(t: Theme): number {
  return t.radius.md;
}

/** Media cards dim slightly when pressed; list rows highlight instead (see ListRow). */
function pressedDim(pressed: boolean) {
  return { opacity: pressed ? 0.8 : 1 };
}

/** Full-bleed network image for card backgrounds; renders nothing when the URL is not allowed. */
function Backdrop({ uri, contentFit = "cover", position = "center" }: Readonly<{ uri: string | undefined; contentFit?: ImageContentFit; position?: ImageContentPosition }>) {
  if (!uri || !isAllowedMediaUrl(uri)) return null;
  return (
    <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit={contentFit} contentPosition={position} transition={150} cachePolicy="memory-disk" recyclingKey={uri} />
  );
}

export interface HeroCardProps {
  imageUri: string | undefined;
  title: string;
  /** Short context line above the title (a date, a role). */
  eyebrow?: string;
  subtitle?: string;
  onPress?: () => void;
  height?: number;
  width?: number;
  contentFit?: ImageContentFit;
  /** Where to anchor a cropped image; `"top center"` keeps faces in portrait art. */
  contentPosition?: ImageContentPosition;
}

/** Large image with its title on a bottom scrim: featured news, bundles, maps, agents. */
export function HeroCard({ imageUri, title, eyebrow, subtitle, onPress, height = 220, width, contentFit = "cover", contentPosition }: Readonly<HeroCardProps>) {
  const t = useTheme();
  const spoken = [eyebrow, title, subtitle].filter(Boolean).join(", ");
  const body = (
    <View
      style={{
        height,
        width,
        borderRadius: cardRadius(t),
        borderCurve: "continuous",
        overflow: "hidden",
        backgroundColor: t.colors.surfaceSunken,
      }}
    >
      <Backdrop uri={imageUri} contentFit={contentFit} {...(contentPosition ? { position: contentPosition } : {})} />
      <View style={[StyleSheet.absoluteFill, { experimental_backgroundImage: `linear-gradient(to bottom, ${t.colors.mediaScrimClear} 40%, ${t.colors.mediaScrim} 100%)` }]} />
      <View style={{ flex: 1, justifyContent: "flex-end", padding: t.space[4], gap: t.space[1] }}>
        {eyebrow ? (
          <Text variant="caption" weight="medium" color="onMediaSecondary" numberOfLines={1}>
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
    <Pressable accessibilityRole="button" accessibilityLabel={spoken} onPress={onPress} style={({ pressed }) => pressedDim(pressed)}>
      {body}
    </Pressable>
  );
}

export interface MediaCardProps {
  imageUri: string | undefined;
  title: string;
  subtitle?: string;
  width: number;
  /** Width / height of the image. */
  aspectRatio?: number;
  contentFit?: ImageContentFit;
  contentPosition?: ImageContentPosition;
  /** Insets the art from the stage edges; for cut-out objects such as weapons. */
  inset?: boolean;
  selected?: boolean;
  onPress?: () => void;
}

/** Grid cell: art on a stage with the name below it. Agents, guide sections, map picks. */
export function MediaCard({ imageUri, title, subtitle, width, aspectRatio = 1, contentFit = "cover", contentPosition, inset, selected, onPress }: Readonly<MediaCardProps>) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle].filter(Boolean).join(", ")}
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => [{ width, gap: t.space[2] }, pressedDim(pressed)]}
    >
      <View
        style={{
          aspectRatio,
          borderRadius: cardRadius(t),
          borderCurve: "continuous",
          overflow: "hidden",
          backgroundColor: t.colors.surfaceSunken,
          borderWidth: selected ? t.borderWidth.thick : 0,
          borderColor: t.colors.accent,
          padding: inset ? t.space[4] : 0,
        }}
      >
        <View style={{ flex: 1 }}>
          <Backdrop uri={imageUri} contentFit={contentFit} {...(contentPosition ? { position: contentPosition } : {})} />
        </View>
      </View>
      <View>
        <Text variant="bodySm" weight="semibold" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Product-style card: cut-out art on a neutral stage, name and meta below. Weapons, store offers, skins. */
export function ShowcaseCard({
  imageUri,
  title,
  meta,
  width,
  imageAspectRatio = 1.8,
  onPress,
}: Readonly<{ imageUri: string | undefined; title: string; meta?: ReactNode; width?: number; imageAspectRatio?: number; onPress?: () => void }>) {
  const t = useTheme();
  const body = (
    <View style={{ width, gap: t.space[2] }}>
      <View style={{ aspectRatio: imageAspectRatio, borderRadius: cardRadius(t), borderCurve: "continuous", backgroundColor: t.colors.surfaceSunken, padding: t.space[3] }}>
        <View style={{ flex: 1 }}>
          <Backdrop uri={imageUri} contentFit="contain" />
        </View>
      </View>
      <View style={{ gap: 2 }}>
        <Text variant="bodySm" weight="semibold" numberOfLines={2}>
          {title}
        </Text>
        {meta}
      </View>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => pressedDim(pressed)}>
      {body}
    </Pressable>
  );
}

/** Wrapping grid row for fixed-width cells produced by `useColumnWidth`. */
export function Grid({ children, gap, rowGap }: Readonly<{ children: ReactNode; gap?: number; rowGap?: number }>) {
  const t = useTheme();
  const g = gap ?? t.space[3];
  return <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: g, rowGap: rowGap ?? t.space[4] }}>{children}</View>;
}
