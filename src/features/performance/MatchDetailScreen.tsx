import { View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { playerLine, type MatchDetail, type PlayerProfile } from "@valhub/domain";
import { useSession } from "@/auth/session";
import { CapabilityNotice } from "@/components/domain/Notices";
import { MatchScore, useQueueName } from "@/components/domain/rows";
import { Avatar, Divider, Metric, QueryView, Screen, SectionHeader, Surface, Text } from "@/components/ui";
import { useAgents, useMap, useMatch, useMe } from "@/data/queries";
import { useTheme } from "@/design/theme";
import { useT } from "@/i18n";
import { formatPercent } from "@/lib/format";

/** "Your team" / "Enemy team" from the player's side; Riot's Red/Blue ids only as a fallback. */
function useTeamName(match: MatchDetail, me: PlayerProfile | undefined) {
  const { t } = useT();
  const myTeam = match.players.find((p) => p.puuid === me?.puuid)?.teamId;
  return (teamId: string, fallbackIndex: number) => {
    if (myTeam) return teamId === myTeam ? t("performance.myTeam") : t("performance.enemyTeam");
    if (teamId === "Red") return t("performance.teamRed");
    if (teamId === "Blue") return t("performance.teamBlue");
    return t("performance.team", { n: fallbackIndex + 1 });
  };
}

function Scoreboard({ match, me }: Readonly<{ match: MatchDetail; me: PlayerProfile | undefined }>) {
  const t = useTheme();
  const { t: tr, formatNumber } = useT();
  const agents = useAgents();
  const teamName = useTeamName(match, me);
  const myTeam = match.players.find((p) => p.puuid === me?.puuid)?.teamId;
  // Own team first.
  const teams = [...new Set(match.players.map((p) => p.teamId))].sort((a, b) => Number(b === myTeam) - Number(a === myTeam));
  return (
    <>
      {teams.map((teamId, index) => {
        const team = match.teams.find((x) => x.teamId === teamId);
        const players = match.players.filter((p) => p.teamId === teamId).sort((a, b) => b.score - a.score);
        return (
          <View key={teamId}>
            <SectionHeader title={teamName(teamId, index)} trailing={<Text weight="bold" numeric>{team?.roundsWon ?? 0}</Text>} />
            <Surface>
              {players.map((p, i) => {
                const agent = agents.data?.find((a) => a.id === p.agentId);
                const acs = p.roundsPlayed ? p.score / p.roundsPlayed : 0;
                const isMe = p.puuid === me?.puuid;
                const kda = `${p.kills}/${p.deaths}/${p.assists}`;
                const spoken = [p.gameName, agent?.name ?? "", `${tr("performance.acs")} ${formatNumber(acs)}`, kda].join(", ");
                return (
                  <View key={p.puuid}>
                    {i > 0 ? <Divider inset={16} /> : null}
                    <View
                      accessible
                      accessibilityLabel={spoken}
                      style={{ flexDirection: "row", alignItems: "center", gap: t.space[3], paddingHorizontal: t.space[4], paddingVertical: t.space[2], backgroundColor: isMe ? t.colors.accentSubtle : "transparent" }}
                    >
                      <Avatar uri={agent?.iconUrl} size={32} />
                      <Text weight={isMe ? "bold" : "medium"} style={{ flex: 1 }} numberOfLines={1}>
                        {p.gameName}
                      </Text>
                      {/* Min widths keep columns aligned; they grow instead of clipping at large text sizes. */}
                      <Text numeric variant="bodySm" style={{ minWidth: 44 }} align="right" numberOfLines={1}>
                        {formatNumber(acs)}
                      </Text>
                      <Text numeric variant="bodySm" style={{ minWidth: 76 }} align="right" color="textSecondary" numberOfLines={1}>
                        {kda}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </Surface>
          </View>
        );
      })}
    </>
  );
}

type PlayerLine = NonNullable<ReturnType<typeof playerLine>>;

function MatchHeader({ match, mapName }: Readonly<{ match: MatchDetail; mapName: string | undefined }>) {
  const t = useTheme();
  const { formatDateTime } = useT();
  const queueName = useQueueName();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: t.space[3] }}>
      <View style={{ flex: 1 }}>
        <Text variant="titleSm" weight="bold">
          {mapName ?? match.mapId}
        </Text>
        <Text variant="bodySm" color="textSecondary">
          {queueName(match.queue)} · {formatDateTime(match.startedAt)}
        </Text>
      </View>
      <MatchScore {...(match.won !== undefined ? { won: match.won } : {})} roundsWon={match.roundsWon} roundsLost={match.roundsLost} />
    </View>
  );
}

function LineMetrics({ line }: Readonly<{ line: PlayerLine }>) {
  const t = useTheme();
  const { t: tr, formatNumber } = useT();
  const orDash = (v: number | undefined, fmt: (n: number) => string) => (v !== undefined ? fmt(v) : "—");
  return (
    <View style={{ flexDirection: "row", gap: t.space[3], marginTop: t.space[4] }}>
      <Metric label={tr("performance.kda")} value={`${line.player.kills}/${line.player.deaths}/${line.player.assists}`} />
      <Metric label={tr("performance.acs")} value={orDash(line.acs, formatNumber)} />
      <Metric label={tr("performance.hs")} value={orDash(line.hsPercent, (v) => formatPercent(v / 100))} />
      <Metric label={tr("performance.adr")} value={orDash(line.adr, formatNumber)} />
    </View>
  );
}

function RoundStrip({ match, line }: Readonly<{ match: MatchDetail; line: PlayerLine | undefined }>) {
  const t = useTheme();
  const { t: tr } = useT();
  if (match.rounds.length === 0) return null;
  return (
    <>
      <SectionHeader title={tr("performance.rounds")} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.space[1] }}>
        {match.rounds.map((r) => {
          const mine = line ? r.winningTeam === line.player.teamId : undefined;
          let outcome = r.winningTeam;
          if (mine !== undefined) outcome = mine ? tr("performance.won") : tr("performance.lost");
          const plant = r.plantSite ? `, ${tr("performance.planted", { site: r.plantSite })}` : "";
          return (
            <View
              key={r.number}
              accessible
              accessibilityLabel={`${tr("performance.round", { n: r.number })}: ${outcome}${plant}`}
              style={{
                minWidth: 30,
                height: 30,
                paddingHorizontal: 2,
                borderRadius: t.radius.xs,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: t.colors[roundTone(mine).background],
              }}
            >
              <Text variant="caption" numeric weight="semibold" color={roundTone(mine).text}>
                {r.number}
              </Text>
            </View>
          );
        })}
      </View>
    </>
  );
}

function Body({ match }: Readonly<{ match: MatchDetail }>) {
  const { t: tr } = useT();
  const me = useMe(true);
  const map = useMap(match.mapId);
  const line = me.data ? playerLine(match, me.data.puuid) : undefined;

  return (
    <>
      <Stack.Screen options={{ title: map.data?.name ?? tr("performance.scoreboard") }} />
      <MatchHeader match={match} mapName={map.data?.name} />
      {line ? <LineMetrics line={line} /> : null}
      <Scoreboard match={match} me={me.data} />
      <RoundStrip match={match} line={line} />
    </>
  );
}

/** Round chip colours: neutral when the player's team is unknown, otherwise won/lost. */
function roundTone(mine: boolean | undefined) {
  if (mine === undefined) return { background: "surfaceSunken", text: "textSecondary" } as const;
  return mine
    ? ({ background: "positiveSubtle", text: "positive" } as const)
    : ({ background: "negativeSubtle", text: "negative" } as const);
}

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useT();
  const session = useSession();
  const match = useMatch(id, session.signedIn);
  if (!session.signedIn) {
    return (
      <Screen>
        <CapabilityNotice title={t("performance.connectTitle")} body={t("performance.connectBody")} />
      </Screen>
    );
  }
  return (
    <Screen>
      <QueryView query={match}>{(m) => <Body match={m} />}</QueryView>
    </Screen>
  );
}
