import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Pressable, Share, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Icon, IconButton, Text } from "@/components/ui";
import { useTheme } from "@/design/theme";
import { useT } from "@/i18n";

/**
 * The generated code, always visible. Copy morphs into a check for a moment so the action
 * is confirmed where the thumb is, not only in a toast.
 */
export function CodeBar({ code, onPaste }: Readonly<{ code: string; onPaste: (value: string) => void }>) {
  const t = useTheme();
  const { t: tr } = useT();
  const [copied, setCopied] = useState(false);
  const [pop] = useState(() => new Animated.Value(1));
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    await Clipboard.setStringAsync(code);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    AccessibilityInfo.announceForAccessibility(tr("crosshair.copied"));
    setCopied(true);
    pop.setValue(0.6);
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 14 }).start();
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  };

  return (
    <View style={{ gap: t.space[2] }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: t.space[2],
          paddingLeft: t.space[4],
          paddingRight: t.space[1],
          minHeight: 52,
          paddingVertical: t.space[1],
          borderRadius: t.radius.md,
          borderCurve: "continuous",
          backgroundColor: t.colors.surfaceSunken,
          borderWidth: t.borderWidth.thin,
          borderColor: copied ? t.colors.positive : t.colors.border,
        }}
      >
        <Text numeric selectable variant="bodySm" style={{ flex: 1 }}>
          {code}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel={tr("crosshair.copyCode")} onPress={() => void copy()} hitSlop={6} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
          <Animated.View style={{ transform: [{ scale: pop }] }}>
            <Icon name={copied ? "check" : "copy"} size={20} color={copied ? "positive" : "textPrimary"} />
          </Animated.View>
        </Pressable>
        <IconButton icon="paste" label={tr("crosshair.paste")} onPress={() => void Clipboard.getStringAsync().then((v) => onPaste(v.trim()))} />
        <IconButton icon="share" label={tr("common.share")} onPress={() => void Share.share({ message: code })} />
      </View>
      {copied ? (
        <Text variant="caption" color="positive">
          {tr("crosshair.copied")}
        </Text>
      ) : null}
    </View>
  );
}
