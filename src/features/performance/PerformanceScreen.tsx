import { useMemo, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { AppError, MIN_SAMPLE_MATCHES, RIOT_REGIONS, groupPerformance, type MatchSummary, type RiotRegion } from "@valhub/domain";
import { needsReconnect } from "@/auth/reconnect";
import { useSession } from "@/auth/session";
import { CapabilityNotice } from "@/components/domain/Notices";
import { MatchRow } from "@/components/domain/rows";
import {
  Button,
  ChipRow,
  EmptyState,
  ErrorState,
  FilterChip,
  ListRow,
  Metric,
  QueryView,
  RowGroup,
  Screen,
  SectionHeader,
  SegmentedControl,
  SkeletonRows,
  Surface,
  Text,
} from "@/components/ui";
import { useAgents, useLeaderboard, useMaps, useMe, useMyMatches, usePlatformStatus } from "@/data/queries";
import { useTheme } from "@/design/theme";
import { useT } from "@/i18n";
import { useCapability } from "@/lib/capabilities";
import { formatPercent } from "@/lib/format";

function ConnectPanel() {
  const { t } = useT();
  return (
    <CapabilityNotice
      title={t("performance.connectTitle")}
      body={t("performance.connectBody")}
      action={{ label: t("common.signIn"), onPress: () => router.push("/auth/riot") }}
    />
  );
}

/** Shown when the ~1 h Riot token ran out; the login page usually completes on its own from Riot's cookies. */
function ReconnectPanel() {
  const { t } = useT();
  return <CapabilityNotice title={t("auth.reconnect")} body={t("auth.expired")} action={{ label: t("auth.reconnect"), onPress: () => router.push("/auth/riot") }} />;
}

function Breakdown({ title, matches, keyOf, nameOf }: Readonly<{ title: string; matches: MatchSummary[]; keyOf: (m: MatchSummary) => string | undefined; nameOf: (key: string) => string }>) {
  const { t, formatNumber } = useT();
  const groups = useMemo(() => groupPerformance(matches, keyOf).slice(0, 5), [matches, keyOf]);
  if (groups.length === 0) return null;
  return (
    <>
      <SectionHeader title={title} />
      <RowGroup>
        {groups.map((g) => (
          <ListRow
            key={g.key}
            title={nameOf(g.key)}
            subtitle={`${t("performance.matches")} ${g.matches} · ${t("performance.winRate")} ${formatPercent(g.winRate)} · ${t("performance.kd")} ${formatNumber(g.kd, 2)}`}
          />
        ))}
      </RowGroup>
      {groups.some((g) => g.matches < MIN_SAMPLE_MATCHES) ? (
        <Text variant="caption" color="textTertiary" style={{ marginTop: 6 }}>
          {t("performance.insufficientSample", { n: MIN_SAMPLE_MATCHES })}
        </Text>
      ) : null}
    </>
  );
}

function PlayerView() {
  const t = useTheme();
  const { t: tr, formatNumber } = useT();
  const me = useMe(true);
  const matches = useMyMatches(true);
  const agents = useAgents();
  const maps = useMaps();
  const all = useMemo(() => matches.data?.pages.flatMap((p) => p.items) ?? [], [matches.data]);
  const agentName = (id: string) => agents.data?.find((a) => a.id === id)?.name ?? id;
  const mapName = (id: string) => maps.data?.find((m) => m.id === id)?.name ?? id;

  const wins = all.filter((m) => m.won).length;
  const kills = all.reduce((s, m) => s + (m.kills ?? 0), 0);
  const deaths = all.reduce((s, m) => s + (m.deaths ?? 0), 0);
  const kd = deaths === 0 ? kills : kills / deaths;

  if (matches.isError && all.length === 0) {
    if (needsReconnect(matches.error)) return <ReconnectPanel />;
    const code = matches.error instanceof AppError ? matches.error.code : "UPSTREAM";
    return <ErrorState code={code} onRetry={() => void matches.refetch()} />;
  }

  return (
    <>
      <QueryView query={me} compactError loading={<SkeletonRows count={1} />}>
        {(profile) => (
          <Surface padded style={{ experimental_backgroundImage: `linear-gradient(120deg, ${t.colors.accentSubtle} 0%, ${t.colors.surface} 70%)` }}>
            <Text variant="titleSm" weight="bold">
              {profile.gameName}
              <Text color="textTertiary">#{profile.tagLine}</Text>
            </Text>
            <Text variant="bodySm" color="textSecondary" style={{ marginTop: 2 }}>
              {profile.rank ? `${tr("performance.rank")}: ${profile.rank.name}` : tr("performance.unranked")} · {profile.region.toUpperCase()}
            </Text>
          </Surface>
        )}
      </QueryView>

      {all.length > 0 ? (
        <View
          accessible
          accessibilityLabel={tr("performance.summaryText", { wins, matches: all.length, kd: formatNumber(kd, 2) })}
          style={{ marginTop: t.space[3] }}
        >
          <Surface padded style={{ flexDirection: "row", gap: t.space[3] }}>
            <Metric label={tr("performance.matches")} value={String(all.length)} />
            <Metric label={tr("performance.winRate")} value={formatPercent(wins / all.length)} />
            <Metric label={tr("performance.kd")} value={formatNumber(kd, 2)} />
          </Surface>
        </View>
      ) : null}

      <SectionHeader title={tr("performance.recentMatches")} />
      {matches.isLoading ? <SkeletonRows /> : null}
      {!matches.isLoading && all.length === 0 ? (
        <Surface>
          <EmptyState icon="swords" title={tr("performance.noMatches")} />
        </Surface>
      ) : null}
      {!matches.isLoading && all.length > 0 ? (
        <RowGroup>
          {all.map((m) => {
            const agent = agents.data?.find((a) => a.id === m.agentId);
            return <MatchRow key={m.id} match={m} {...(agent ? { agent } : {})} mapName={mapName(m.mapId)} onPress={() => router.push(`/matches/${m.id}`)} />;
          })}
        </RowGroup>
      ) : null}
      {matches.hasNextPage ? (
        <Button
          label={tr("common.loadMore")}
          variant="ghost"
          loading={matches.isFetchingNextPage}
          onPress={() => void matches.fetchNextPage()}
          style={{ marginTop: t.space[2] }}
        />
      ) : null}

      <Breakdown title={tr("performance.byAgent")} matches={all} keyOf={(m) => m.agentId} nameOf={agentName} />
      <Breakdown title={tr("performance.byMap")} matches={all} keyOf={(m) => m.mapId} nameOf={mapName} />
    </>
  );
}

const riotId = (gameName: string, tagLine: string | undefined) => `${gameName}#${tagLine ?? ""}`;

function Leaderboard() {
  const theme = useTheme();
  const { t, formatNumber } = useT();
  const session = useSession();
  // Until the player picks one, follow their own region once the profile has loaded.
  const [picked, setPicked] = useState<RiotRegion | undefined>(undefined);
  const region = picked ?? session.profile?.region ?? "eu";
  const cap = useCapability("LEADERBOARD");
  const board = useLeaderboard(region, cap?.available === true);
  if (!cap?.available) {
    return (
      <CapabilityNotice
        title={t("performance.leaderboard")}
        body={t("capability.SIGN_IN_REQUIRED")}
        action={{ label: t("common.signIn"), onPress: () => router.push("/auth/riot") }}
      />
    );
  }
  return (
    <>
      <SectionHeader title={t("performance.leaderboard")} />
      <ChipRow>
        {RIOT_REGIONS.map((r) => (
          <FilterChip key={r} label={r.toUpperCase()} selected={r === region} onPress={() => setPicked(r)} />
        ))}
      </ChipRow>
      <View style={{ height: theme.space[2] }} />
      <QueryView query={board} compactError>
        {(lb) => (
          <RowGroup>
            {lb.entries.slice(0, 25).map((e) => (
              <ListRow
                key={e.rank}
                title={`${e.rank}. ${e.gameName ? riotId(e.gameName, e.tagLine) : t("performance.anonymous")}`}
                meta={t("performance.rr", { rr: formatNumber(e.rankedRating) })}
                subtitle={t("performance.wins", { n: e.wins })}
              />
            ))}
          </RowGroup>
        )}
      </QueryView>
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

function Overview() {
  const { t } = useT();
  const session = useSession();
  const identity = useCapability("PLAYER_IDENTITY");
  if (!session.ready || identity === undefined) return <SkeletonRows count={3} />;
  if (session.signedIn) return <PlayerView />;
  if (identity.available) return <ConnectPanel />;
  return <CapabilityNotice title={t("performance.notConfiguredTitle")} body={t("performance.notConfiguredBody")} />;
}

export default function PerformanceScreen() {
  const theme = useTheme();
  const { t } = useT();
  const identity = useCapability("PLAYER_IDENTITY");
  const [tab, setTab] = useState<"me" | "leaderboard">("me");

  return (
    <Screen>
      <SegmentedControl
        label={t("performance.title")}
        value={tab}
        onChange={setTab}
        options={[
          { value: "me", label: t("performance.overview") },
          { value: "leaderboard", label: t("performance.leaderboard") },
        ]}
      />
      <View style={{ height: theme.space[4] }} />
      {tab === "leaderboard" ? (
        <>
          <Leaderboard />
          <PlatformStatusSection />
          {identity?.available === false ? (
            <CapabilityNotice title={t("performance.notConfiguredTitle")} body={t("performance.notConfiguredBody")} />
          ) : null}
        </>
      ) : (
        <Overview />
      )}
    </Screen>
  );
}
