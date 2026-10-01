import { useState } from "react";
import { View } from "react-native";
import { Stack, router } from "expo-router";
import { RIOT_REGIONS, type RiotRegion } from "@valhub/domain";
import { useSession } from "@/auth/session";
import { CapabilityNotice } from "@/components/domain/Notices";
import { ChipRow, FilterChip, ListRow, QueryView, RowGroup, Screen } from "@/components/ui";
import { useLeaderboard } from "@/data/queries";
import { useTheme } from "@/design/theme";
import { useT } from "@/i18n";
import { useCapability } from "@/lib/capabilities";

const riotId = (gameName: string, tagLine: string | undefined) => `${gameName}#${tagLine ?? ""}`;

function Board() {
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
      <ChipRow>
        {RIOT_REGIONS.map((r) => (
          <FilterChip key={r} label={r.toUpperCase()} selected={r === region} onPress={() => setPicked(r)} />
        ))}
      </ChipRow>
      <View style={{ height: theme.space[3] }} />
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

export default function LeaderboardScreen() {
  const { t } = useT();
  return (
    <Screen>
      <Stack.Screen options={{ title: t("performance.leaderboard") }} />
      <Board />
    </Screen>
  );
}
