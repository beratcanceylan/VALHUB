import { useEffect, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, View, type DimensionValue } from "react-native";
import type { AppErrorCode } from "@valhub/domain";
import { useTheme } from "@/design/theme";
import { useT } from "@/i18n";
import { Button } from "./Button";
import { Icon, type IconName } from "./Icon";
import { Text } from "./Text";

export function Skeleton({ width = "100%", height = 16, radius }: Readonly<{ width?: DimensionValue; height?: number; radius?: number }>) {
  const t = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.6));
  useEffect(() => {
    let loop: Animated.CompositeAnimation | undefined;
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce || cancelled) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.6, duration: 600, useNativeDriver: true }),
        ]),
      );
      loop.start();
    });
    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [opacity]);
  return <Animated.View style={{ width, height, borderRadius: radius ?? t.radius.xs, backgroundColor: t.colors.skeleton, opacity }} />;
}

export function SkeletonRows({ count = 5 }: Readonly<{ count?: number }>) {
  const t = useTheme();
  const { t: tr } = useT();
  return (
    <View accessible accessibilityLabel={tr("common.loading")} style={{ gap: t.space[4], paddingVertical: t.space[3] }}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ flexDirection: "row", gap: t.space[3], alignItems: "center" }}>
          <Skeleton width={40} height={40} radius={t.radius.sm} />
          <View style={{ flex: 1, gap: t.space[2] }}>
            <Skeleton width="60%" />
            <Skeleton width="35%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function EmptyState({ title, message, icon = "search", action }: Readonly<{ title: string; message?: string; icon?: IconName; action?: ReactNode }>) {
  const t = useTheme();
  return (
    <View style={{ alignItems: "center", paddingVertical: t.space[8], paddingHorizontal: t.space[6], gap: t.space[2] }}>
      <Icon name={icon} size={24} color="textTertiary" />
      <Text weight="semibold" align="center">
        {title}
      </Text>
      {message ? (
        <Text variant="bodySm" color="textSecondary" align="center">
          {message}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: t.space[2] }}>{action}</View> : null}
    </View>
  );
}

const ERROR_ICON: Partial<Record<AppErrorCode, IconName>> = {
  NETWORK: "offline",
  TIMEOUT: "clock",
  RATE_LIMITED: "timer",
  CAPABILITY_DISABLED: "alert",
};

export function ErrorState({ code, onRetry, compact }: Readonly<{ code: AppErrorCode; onRetry?: () => void; compact?: boolean }>) {
  const t = useTheme();
  const { t: tr } = useT();
  const retryable = code === "NETWORK" || code === "TIMEOUT" || code === "UPSTREAM" || code === "RATE_LIMITED";
  const title = tr(`errors.${code}.title`);
  const message = tr(`errors.${code}.message`);
  return (
    <View
      style={{
        alignItems: compact ? "flex-start" : "center",
        paddingVertical: compact ? t.space[3] : t.space[8],
        paddingHorizontal: compact ? 0 : t.space[6],
        gap: t.space[2],
      }}
    >
      {/* Message is one announced alert; the retry button stays separately focusable. */}
      <View
        accessible
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${title}. ${message}`}
        style={{ alignItems: compact ? "flex-start" : "center", gap: t.space[2] }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: t.space[2] }}>
          <Icon name={ERROR_ICON[code] ?? "alert"} size={compact ? 16 : 22} color="textSecondary" />
          <Text weight="semibold" style={{ flexShrink: 1 }}>
            {title}
          </Text>
        </View>
        <Text variant="bodySm" color="textSecondary" align={compact ? "left" : "center"}>
          {message}
        </Text>
      </View>
      {retryable && onRetry ? <Button label={tr("common.retry")} variant="secondary" size="sm" icon="refresh" onPress={onRetry} /> : null}
    </View>
  );
}

/** Shown when content is being served from a stale cache after a failed refresh. */
export function StaleNotice({ updatedAt }: Readonly<{ updatedAt: number }>) {
  const t = useTheme();
  const { t: tr, formatRelative } = useT();
  return (
    <View
      accessibilityRole="text"
      style={{ flexDirection: "row", alignItems: "center", gap: t.space[2], paddingVertical: t.space[2], paddingHorizontal: t.space[3], backgroundColor: t.colors.warningSubtle, borderRadius: t.radius.md, borderCurve: "continuous", marginBottom: t.space[3] }}
    >
      <Icon name="offline" size={14} color="warning" />
      <Text variant="caption" color="warning" style={{ flex: 1 }}>
        {tr("common.staleData", { when: formatRelative(updatedAt) })}
      </Text>
    </View>
  );
}
