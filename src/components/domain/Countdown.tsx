import { useEffect, useState } from "react";
import { View } from "react-native";
import { Icon, Text } from "@/components/ui";
import { useT } from "@/i18n";

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Ticking `hh:mm:ss` (with days in front when longer) until `until`. */
export function Countdown({ until, labelKey }: Readonly<{ until: string; labelKey: "store.refreshesIn" | "store.endsIn" }>) {
  const { t } = useT();
  const now = useNow(1000);
  const total = Math.max(0, Math.floor((Date.parse(until) - now) / 1000));
  const days = Math.floor(total / 86_400);
  const clock = `${pad(Math.floor((total % 86_400) / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
  const time = days > 0 ? t("store.days", { d: days, time: clock }) : clock;
  return (
    <View accessible accessibilityLabel={t(labelKey, { time })} style={{ flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1 }}>
      <Icon name="clock" size={14} color="textTertiary" />
      <Text variant="caption" color="textTertiary" numeric numberOfLines={1}>
        {time}
      </Text>
    </View>
  );
}
