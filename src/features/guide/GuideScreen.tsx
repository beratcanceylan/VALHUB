import { router } from "expo-router";
import { Grid, MediaCard, Screen, useColumnWidth } from "@/components/ui";
import { useAgents, useCosmetics, useMaps, useWeapons } from "@/data/queries";
import { useT } from "@/i18n";

/** Cover art for each reference section, taken from the content itself (no bundled media). */
function useCovers() {
  const agents = useAgents();
  const maps = useMaps();
  const weapons = useWeapons();
  const bundles = useCosmetics({ kind: "BUNDLE" });
  const agent = agents.data?.find((a) => a.portraitUrl && a.gradient) ?? agents.data?.[0];
  const map = maps.data?.find((m) => m.isStandard && m.splashUrl);
  const weapon = weapons.data?.find((w) => w.category === "RIFLE") ?? weapons.data?.[0];
  const bundle = bundles.data?.pages[0]?.items[0];
  return { agent, map, weapon, bundle };
}

export default function LearnScreen() {
  const { t } = useT();
  const width = useColumnWidth(2);
  const { agent, map, weapon, bundle } = useCovers();
  return (
    <Screen>
      <Grid>
        <MediaCard
          width={width}
          aspectRatio={0.8}
          imageUri={agent?.portraitUrl ?? agent?.iconUrl}
          contentPosition="top center"
          {...(agent?.gradient ? { gradient: agent.gradient } : {})}
          title={t("learn.agents")}
          onPress={() => router.push("/agents")}
        />
        <MediaCard width={width} aspectRatio={0.8} imageUri={map?.splashUrl} title={t("learn.maps")} onPress={() => router.push("/maps")} />
        <MediaCard
          width={width}
          aspectRatio={0.8}
          imageUri={weapon?.iconUrl}
          contentFit="contain"
          title={t("learn.weapons")}
          onPress={() => router.push("/weapons")}
        />
        <MediaCard
          width={width}
          aspectRatio={0.8}
          imageUri={bundle?.thumbnailUrl}
          title={t("learn.cosmetics")}
          onPress={() => router.push("/cosmetics")}
        />
      </Grid>
    </Screen>
  );
}
