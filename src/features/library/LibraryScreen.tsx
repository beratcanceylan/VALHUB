import { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { Favorite } from "@valhub/domain";
import { useSession } from "@/auth/session";
import { Grid, Icon, Screen, SectionHeader, Text, Tile, useColumnWidth, type IconName } from "@/components/ui";
import { favorites, savedCrosshairs, strategies } from "@/data/repositories/library";
import { useTheme } from "@/design/theme";
import { useT, type MessageKey } from "@/i18n";

interface Counts {
  wishlist: Favorite[];
  agents: Favorite[];
  crosshairs: number;
  strategies: number;
}

function load(): Counts {
  return {
    wishlist: favorites.list("COSMETIC"),
    agents: favorites.list("AGENT"),
    crosshairs: savedCrosshairs.list().length,
    strategies: strategies.list().length,
  };
}

/** Player card at the top of the hub: the linked Riot ID, or a prompt to connect. */
function PlayerCard() {
  const t = useTheme();
  const { t: tr } = useT();
  const session = useSession();
  const profile = session.profile;
  const body = (
    <>
      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: t.colors.accent, alignItems: "center", justifyContent: "center" }}>
        <Icon name="user" size={26} color="onAccent" />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="titleSm" weight="bold" numberOfLines={1}>
          {profile ? profile.gameName : tr("common.signIn")}
          {profile ? <Text color="textTertiary"> #{profile.tagLine}</Text> : null}
        </Text>
        {profile?.rank ? (
          <Text variant="bodySm" color="textSecondary" numberOfLines={1}>
            {profile.rank.name}
          </Text>
        ) : null}
      </View>
      {profile ? null : <Icon name="chevronRight" size={20} color="textTertiary" />}
    </>
  );
  const style = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.space[3],
    padding: t.space[4],
    borderRadius: t.radius.lg + 4,
    borderCurve: "continuous" as const,
    backgroundColor: t.colors.surface,
    experimental_backgroundImage: `linear-gradient(120deg, ${t.colors.accentSubtle} 0%, ${t.colors.surface} 70%)`,
    borderWidth: t.borderWidth.hairline,
    borderColor: t.colors.border,
  };
  if (profile) return <View style={style}>{body}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={tr("common.signIn")} onPress={() => router.push("/auth/riot")} style={({ pressed }) => [style, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
      {body}
    </Pressable>
  );
}

interface HubItem {
  icon: IconName;
  label: MessageKey;
  href: string;
  detail?: string;
}

export default function LibraryScreen() {
  const { t } = useT();
  const [data, setData] = useState<Counts>(load);
  useFocusEffect(useCallback(() => setData(load()), []));
  const width = useColumnWidth(2);
  const count = (n: number) => (n > 0 ? t("library.count", { n }) : t("library.empty"));

  const saved: HubItem[] = [
    { icon: "crosshair", label: "library.crosshairs", href: "/crosshairs", detail: count(data.crosshairs) },
    { icon: "pencil", label: "library.strategies", href: "/strategy", detail: count(data.strategies) },
    { icon: "layers", label: "library.wishlist", href: "/library/wishlist", detail: count(data.wishlist.length) },
    { icon: "user", label: "library.agents", href: "/library/agents", detail: count(data.agents.length) },
  ];
  const tools: HubItem[] = [
    { icon: "gauge", label: "library.sensitivity", href: "/tools/sensitivity" },
    { icon: "timer", label: "library.reaction", href: "/tools/reaction" },
  ];
  const renderTiles = (items: HubItem[]) => (
    <Grid>
      {items.map((item) => (
        <Tile key={item.href} icon={item.icon} label={t(item.label)} {...(item.detail ? { detail: item.detail } : {})} width={width} onPress={() => router.push(item.href as never)} />
      ))}
    </Grid>
  );

  return (
    <Screen>
      <PlayerCard />
      <SectionHeader title={t("library.saved")} />
      {renderTiles(saved)}
      <SectionHeader title={t("library.tools")} />
      {renderTiles(tools)}
    </Screen>
  );
}
