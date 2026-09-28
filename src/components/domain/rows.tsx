import { View } from "react-native";
import type { AgentSummary, MapSummary, MatchSummary } from "@valhub/domain";
import { useT, type MessageKey } from "@/i18n";
import { Avatar, Badge, ListRow, RemoteImage, Text } from "@/components/ui";

export function MapRow({ map, onPress }: Readonly<{ map: MapSummary; onPress: () => void }>) {
  return <ListRow title={map.name} leading={<RemoteImage uri={map.thumbnailUrl} width={72} height={40} />} onPress={onPress} />;
}

type Outcome = "won" | "lost" | "draw";

const OUTCOME_TONE = { won: "positive", lost: "negative", draw: "neutral" } as const;

/** No badge when Riot didn't report a result for the player's team (e.g. free-for-all modes). */
function matchOutcome(won: boolean | undefined, roundsWon: number, roundsLost: number): Outcome | undefined {
  if (won === undefined) return undefined;
  if (won) return "won";
  return roundsWon === roundsLost ? "draw" : "lost";
}

/** Riot queue id → localized mode name (unknown ids are shown as-is). */
export function useQueueName(): (queue: string) => string {
  const { t } = useT();
  return (queue) => {
    const key = `performance.queue.${queue || "custom"}`;
    const label = t(key as MessageKey);
    return label === key ? queue : label;
  };
}

export function MatchScore({ won, roundsWon, roundsLost }: Readonly<{ won?: boolean; roundsWon: number; roundsLost: number }>) {
  const { t } = useT();
  const outcome = matchOutcome(won, roundsWon, roundsLost);
  return (
    <View style={{ alignItems: "flex-end", gap: 2 }}>
      <Text variant="titleSm" weight="bold" numeric>
        {roundsWon}–{roundsLost}
      </Text>
      {outcome ? <Badge label={t(`performance.${outcome}`)} tone={OUTCOME_TONE[outcome]} /> : null}
    </View>
  );
}

export function MatchRow({
  match,
  agent,
  mapName,
  onPress,
}: Readonly<{
  match: MatchSummary;
  agent?: AgentSummary;
  mapName?: string;
  onPress: () => void;
}>) {
  const { formatDateTime } = useT();
  const queueName = useQueueName();
  const kda = match.kills !== undefined ? `${match.kills}/${match.deaths ?? 0}/${match.assists ?? 0}` : undefined;
  return (
    <ListRow
      title={mapName ?? match.mapId}
      subtitle={[queueName(match.queue), kda, formatDateTime(match.startedAt, { dateStyle: "short", timeStyle: "short" })]
        .filter(Boolean)
        .join(" · ")}
      leading={<Avatar uri={agent?.iconUrl} size={40} {...(agent ? { label: agent.name } : {})} />}
      trailing={<MatchScore {...(match.won !== undefined ? { won: match.won } : {})} roundsWon={match.roundsWon} roundsLost={match.roundsLost} />}
      chevron={false}
      onPress={onPress}
    />
  );
}
