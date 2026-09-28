import { useState } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { Image, type ImageContentFit } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEvent } from "expo";
import { useTheme } from "@/design/theme";
import { useT } from "@/i18n";
import { isAllowedMediaUrl } from "@/data/media-policy";
import { Icon } from "./Icon";
import { Text } from "./Text";

/**
 * Network image. Uses expo-image's bounded memory/disk cache; never prefetches. URLs
 * outside the on-device host allowlist are not loaded.
 */
export function RemoteImage({
  uri,
  width,
  height,
  aspectRatio,
  contentFit = "cover",
  radius,
  label,
  style,
  tintColor,
}: Readonly<{
  uri: string | undefined;
  width?: number | `${number}%`;
  height?: number;
  aspectRatio?: number;
  contentFit?: ImageContentFit;
  radius?: number;
  /** Accessibility label; omit for decorative images. */
  label?: string;
  style?: StyleProp<ViewStyle>;
  /** Recolors a single-color glyph (currency symbols) to match the theme. */
  tintColor?: string;
}>) {
  const t = useTheme();
  const [failed, setFailed] = useState(false);
  const allowed = uri && isAllowedMediaUrl(uri);
  const frame: StyleProp<ViewStyle> = [
    { width, height, aspectRatio, borderRadius: radius ?? t.radius.sm, borderCurve: "continuous", overflow: "hidden", backgroundColor: t.colors.surfaceSunken },
    style,
  ];
  if (!allowed || failed) {
    return (
      <View style={[frame, { alignItems: "center", justifyContent: "center" }]} accessible={!!label} accessibilityLabel={label}>
        <Icon name="layers" size={16} color="textTertiary" />
      </View>
    );
  }
  return (
    <View style={frame}>
      <Image
        source={{ uri }}
        style={{ width: "100%", height: "100%" }}
        contentFit={contentFit}
        transition={120}
        cachePolicy="memory-disk"
        recyclingKey={uri}
        {...(tintColor ? { tintColor } : {})}
        accessible={!!label}
        accessibilityLabel={label}
        onError={() => setFailed(true)}
      />
    </View>
  );
}

/**
 * Stream-only remote video (agent abilities, skin previews). The player is created lazily
 * when the user taps play (or when shown with `autoPlay`, which is itself a user choice);
 * nothing is downloaded ahead of time or persisted.
 */
export function RemoteVideo({
  uri,
  posterUri,
  label,
  aspectRatio = 16 / 9,
  autoPlay = false,
}: Readonly<{ uri: string; posterUri?: string; label: string; aspectRatio?: number; autoPlay?: boolean }>) {
  const t = useTheme();
  const { t: tr } = useT();
  const [active, setActive] = useState(autoPlay);
  if (!isAllowedMediaUrl(uri)) {
    return (
      <Text variant="bodySm" color="textSecondary">
        {tr("media.unavailable")}
      </Text>
    );
  }
  if (!active) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tr("media.play", { name: label })}
        onPress={() => setActive(true)}
        style={{ aspectRatio, borderRadius: t.radius.md, borderCurve: "continuous", overflow: "hidden", backgroundColor: t.colors.surfaceSunken, alignItems: "center", justifyContent: "center" }}
      >
        {posterUri ? <RemoteImage uri={posterUri} width="100%" height={undefined} aspectRatio={aspectRatio} contentFit="contain" style={{ position: "absolute" }} /> : null}
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.colors.scrim, alignItems: "center", justifyContent: "center" }}>
          <Icon name="play" color="onAccent" />
        </View>
      </Pressable>
    );
  }
  return <ActiveVideo uri={uri} label={label} aspectRatio={aspectRatio} />;
}

function ActiveVideo({ uri, label, aspectRatio }: Readonly<{ uri: string; label: string; aspectRatio: number }>) {
  const t = useTheme();
  const { t: tr } = useT();
  const player = useVideoPlayer({ uri, useCaching: false }, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  const { status } = useEvent(player, "statusChange", { status: player.status });
  if (status === "error") {
    return (
      <View accessibilityRole="alert" style={{ aspectRatio, borderRadius: t.radius.md, borderCurve: "continuous", backgroundColor: t.colors.surfaceSunken, alignItems: "center", justifyContent: "center", padding: t.space[4] }}>
        <Text variant="bodySm" color="textSecondary" align="center">
          {tr("media.failed")}
        </Text>
      </View>
    );
  }
  return (
    <View style={{ aspectRatio, borderRadius: t.radius.md, borderCurve: "continuous", overflow: "hidden", backgroundColor: "black" }}>
      <VideoView player={player} style={{ width: "100%", height: "100%" }} nativeControls contentFit="contain" accessibilityLabel={label} />
    </View>
  );
}

export function Avatar({ uri, size = 40, label }: Readonly<{ uri?: string; size?: number; label?: string }>) {
  const t = useTheme();
  return <RemoteImage uri={uri} width={size} height={size} radius={t.radius.sm} contentFit="contain" {...(label ? { label } : {})} />;
}
