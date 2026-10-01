import { useMemo, useState } from "react";
import { FlatList, View } from "react-native";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { needsReconnect } from "@/auth/reconnect";
import { useSession } from "@/auth/session";
import { Countdown } from "@/components/domain/Countdown";
import { CapabilityNotice } from "@/components/domain/Notices";
import { OfferCard } from "@/components/domain/Offer";
import { Button, Icon, ListRow, QueryView, RowGroup, Screen, SectionHeader, Skeleton, SkeletonRows, Surface, Tag, Text, useColumnWidth } from "@/components/ui";
import { useMyMatches, usePersonalStore, usePlatformStatus } from "@/data/queries";
import { useTheme } from "@/design/theme";
import { useT } from "@/i18n";
import { useCapability } from "@/lib/capabilities";
import { MatchList, ReconnectPanel, SummaryMetrics } from "@/features/performance/PerformanceScreen";

const signIn = () => router.push("/auth/riot");

/** Round badge with an icon, used as the leading art of the profile and connect cards. */
function AccountBadge({ size = 56 }: Readonly<{ size?: number }>) {
  const t = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.colors.surfaceSunken, alignItems: "center", justifyContent: "center" }}>
      <Icon name="account" size={size * 0.5} color="textSecondary" />
    </View>
  );
}

function ConnectCard() {
  const t = useTheme();
  const { t: tr } = useT();
  return (
    <Surface padded style={{ gap: t.space[3] }}>
      <AccountBadge />
      <View style={{ gap: t.space[1] }}>
        <Text variant="titleSm" weight="semibold" accessibilityRole="header">
          {tr("account.connectTitle")}
        </Text>
        <Text variant="bodySm" color="textSecondary">
          {tr("account.connectBody")}
        </Text>
      </View>
      <Button label={tr("common.signIn")} onPress={signIn} />
      <Text variant="caption" color="textTertiary">
        {tr("performance.connectBody")}
      </Text>
    </Surface>
  );
}

/** What connecting unlocks; every row leads to sign-in. */
function LockedFeatures() {
  const theme = useTheme();
  const { t } = useT();
  const lock = <Icon name="lock" size={16} color="textTertiary" />;
  return (
    <View style={{ marginTop: theme.space[6] }}>
      <RowGroup>
        <ListRow icon="store" title={t("store.title")} subtitle={t("account.storeDetail")} trailing={lock} chevron={false} onPress={signIn} />
        <ListRow icon="swords" title={t("performance.title")} subtitle={t("account.matchesDetail")} trailing={lock} chevron={false} onPress={signIn} />
        <ListRow icon="trophy" title={t("performance.leaderboard")} subtitle={t("account.leaderboardDetail")} trailing={lock} chevron={false} onPress={signIn} />
      </RowGroup>
    </View>
  );
}

function ProfileCard() {
  const t = useTheme();
  const { t: tr } = useT();
  const { profile } = useSession();
  return (
    <Surface padded style={{ flexDirection: "row", alignItems: "center", gap: t.space[3] }}>
      <AccountBadge />
      {profile ? (
        <View style={{ flex: 1, gap: t.space[1] }}>
          <Text variant="title" weight="bold" numberOfLines={1}>
            {profile.gameName}
            <Text variant="title" weight="medium" color="textTertiary">
              {" "}#{profile.tagLine}
            </Text>
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.space[1] }}>
            <Tag label={profile.rank ? profile.rank.name : tr("performance.unranked")} />
            <Tag label={profile.region.toUpperCase()} />
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, gap: t.space[2] }}>
          <Skeleton width="60%" height={20} />
          <Skeleton width="40%" height={14} />
        </View>
      )}
    </Surface>
  );
}

function StoreSection() {
  const t = useTheme();
  const { t: tr } = useT();
  const store = usePersonalStore(true);
  const width = useColumnWidth(2.4);
  return (
    <>
      <SectionHeader title={tr("store.title")} actionLabel={tr("common.seeAll")} onAction={() => router.push("/store")} />
      <QueryView query={store} compactError loading={<Skeleton height={150} radius={t.radius.lg} />}>
        {(s) => (
          <>
            <FlatList
              horizontal
              data={s.daily}
              keyExtractor={(o, i) => `${o.id}-${i}`}
              renderItem={({ item }) => <OfferCard offer={item} width={width} />}
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -t.space[4] }}
              contentContainerStyle={{ paddingHorizontal: t.space[4], gap: t.space[3] }}
            />
            <View style={{ marginTop: t.space[2] }}>
              <Countdown until={s.dailyRefreshAt} labelKey="store.refreshesIn" />
            </View>
          </>
        )}
      </QueryView>
    </>
  );
}

function PerformanceSection() {
  const t = useTheme();
  const { t: tr } = useT();
  const matches = useMyMatches(true);
  const all = useMemo(() => matches.data?.pages.flatMap((p) => p.items) ?? [], [matches.data]);
  let body = <SkeletonRows count={3} />;
  if (!matches.isLoading && all.length === 0) body = <ListRow title={tr("performance.noMatches")} icon="swords" />;
  if (all.length > 0) {
    body = (
      <View style={{ gap: t.space[3] }}>
        <SummaryMetrics matches={all} />
        <MatchList matches={all.slice(0, 3)} />
      </View>
    );
  }
  return (
    <>
      <SectionHeader title={tr("performance.title")} actionLabel={tr("common.seeAll")} onAction={() => router.push("/performance")} />
      {body}
    </>
  );
}

function PlatformStatusSection() {
  const { t } = useT();
  const session = useSession();
  // The status feed is public: shown to everyone, for the player's own region when known.
  const status = usePlatformStatus(session.profile?.region ?? "eu", true);
  if (!status.data) return null;
  const items = [...status.data.maintenances, ...status.data.incidents];
  return (
    <>
      <SectionHeader title={t("performance.platformStatus")} />
      <RowGroup>
        {items.length === 0 ? <ListRow title={t("performance.allClear")} icon="check" /> : items.map((i) => <ListRow key={i.id} title={i.title} subtitle={i.message} icon="alert" />)}
      </RowGroup>
    </>
  );
}

function SignedIn() {
  const { t } = useT();
  const session = useSession();
  const matches = useMyMatches(true);
  if (matches.isError && needsReconnect(matches.error)) {
    return (
      <>
        <ProfileCard />
        <SectionHeader title={t("auth.reconnect")} />
        <ReconnectPanel />
      </>
    );
  }
  return (
    <>
      <ProfileCard />
      <StoreSection />
      <PerformanceSection />
      <SectionHeader title={t("performance.leaderboard")} />
      <RowGroup>
        <ListRow icon="trophy" title={t("performance.leaderboard")} subtitle={t("account.leaderboardDetail")} onPress={() => router.push("/leaderboard")} />
      </RowGroup>
      <PlatformStatusSection />
      <SectionHeader title={t("settings.account")} />
      <RowGroup>
        <ListRow icon="signOut" title={t("settings.signOut")} chevron={false} onPress={() => void session.signOut()} />
      </RowGroup>
    </>
  );
}

function Body() {
  const { t } = useT();
  const session = useSession();
  const identity = useCapability("PLAYER_IDENTITY");
  if (!session.ready || identity === undefined) return <SkeletonRows count={3} />;
  if (session.signedIn) return <SignedIn />;
  if (!identity.available) {
    return (
      <>
        <CapabilityNotice title={t("performance.notConfiguredTitle")} body={t("performance.notConfiguredBody")} />
        <PlatformStatusSection />
      </>
    );
  }
  return (
    <>
      <ConnectCard />
      <LockedFeatures />
      <PlatformStatusSection />
    </>
  );
}

/** Everything that needs a Riot account — profile, store, matches, leaderboard — lives on this tab. */
export default function AccountScreen() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.refetchQueries({ type: "active" });
    } finally {
      setRefreshing(false);
    }
  };
  return (
    <Screen refreshing={refreshing} onRefresh={() => void refresh()}>
      <Body />
    </Screen>
  );
}
