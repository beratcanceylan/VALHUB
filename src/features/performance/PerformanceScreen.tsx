import { useMemo } from "react";
import { View } from "react-native";
import { Stack, router } from "expo-router";
import { AppError, MIN_SAMPLE_MATCHES, groupPerformance, type MatchSummary } from "@valhub/domain";
import { needsReconnect } from "@/auth/reconnect";
import { useSession } from "@/auth/session";
import { CapabilityNotice } from "@/components/domain/Notices";
import { MatchRow } from "@/components/domain/rows";
import { Button, EmptyState, ErrorState, ListRow, Metric, RowGroup, Screen, SectionHeader, SkeletonRows, Surface, Text } from "@/components/ui";
import { useAgents, useMaps, useMyMatches } from "@/data/queries";
import { useTheme } from "@/design/theme";
import { useT } from "@/i18n";
import { formatPercent } from "@/lib/format";

export function ConnectPanel() {
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
export function ReconnectPanel() {
  const { t } = useT();
  return <CapabilityNotice title={t("auth.reconnect")} body={t("auth.expired")} action={{ label: t("auth.reconnect"), onPress: () => router.push("/auth/riot") }} />;
}

/** Matches / win rate / K/D across the loaded history. */
export function SummaryMetrics({ matches }: Readonly<{ matches: readonly MatchSummary[] }>) {
  const t = useTheme();
  const { t: tr, formatNumber } = useT();
  if (matches.length === 0) return null;
  const wins = matches.filter((m) => m.won).length;
  const kills = matches.reduce((s, m) => s + (m.kills ?? 0), 0);
  const deaths = matches.reduce((s, m) => s + (m.deaths ?? 0), 0);
  const kd = deaths === 0 ? kills : kills / deaths;
  return (
    <View accessible accessibilityLabel={tr("performance.summaryText", { wins, matches: matches.length, kd: formatNumber(kd, 2) })}>
      <Surface padded style={{ flexDirection: "row", gap: t.space[3] }}>
        <Metric label={tr("performance.matches")} value={String(matches.length)} />
        <Metric label={tr("performance.winRate")} value={formatPercent(wins / matches.length)} />
        <Metric label={tr("performance.kd")} value={formatNumber(kd, 2)} />
      </Surface>
    </View>
  );
}

/** Grouped match rows that open the match detail. */
export function MatchList({ matches }: Readonly<{ matches: readonly MatchSummary[] }>) {
  const agents = useAgents();
  const maps = useMaps();
  return (
    <RowGroup>
      {matches.map((m) => {
        const agent = agents.data?.find((a) => a.id === m.agentId);
        const mapName = maps.data?.find((x) => x.id === m.mapId)?.name ?? m.mapId;
        return <MatchRow key={m.id} match={m} {...(agent ? { agent } : {})} mapName={mapName} onPress={() => router.push(`/matches/${m.id}`)} />;
      })}
    </RowGroup>
  );
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

function History() {
  const t = useTheme();
  const { t: tr } = useT();
  const matches = useMyMatches(true);
  const agents = useAgents();
  const maps = useMaps();
  const all = useMemo(() => matches.data?.pages.flatMap((p) => p.items) ?? [], [matches.data]);
  const agentName = (id: string) => agents.data?.find((a) => a.id === id)?.name ?? id;
  const mapName = (id: string) => maps.data?.find((m) => m.id === id)?.name ?? id;

  if (matches.isError && all.length === 0) {
    if (needsReconnect(matches.error)) return <ReconnectPanel />;
    const code = matches.error instanceof AppError ? matches.error.code : "UPSTREAM";
    return <ErrorState code={code} onRetry={() => void matches.refetch()} />;
  }
  if (matches.isLoading) return <SkeletonRows />;
  if (all.length === 0) {
    return (
      <Surface>
        <EmptyState icon="swords" title={tr("performance.noMatches")} />
      </Surface>
    );
  }

  return (
    <>
      <SummaryMetrics matches={all} />
      <SectionHeader title={tr("performance.recentMatches")} />
      <MatchList matches={all} />
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

/** Full match history and trends; reached from the Account tab. */
export default function PerformanceScreen() {
  const { t } = useT();
  const session = useSession();
  let body = <SkeletonRows count={3} />;
  if (session.ready) body = session.signedIn ? <History /> : <ConnectPanel />;
  return (
    <Screen>
      <Stack.Screen options={{ title: t("performance.title") }} />
      {body}
    </Screen>
  );
}
