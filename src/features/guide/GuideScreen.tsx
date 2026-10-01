import { router } from "expo-router";
import { Grid, MediaCard, Screen, useColumnWidth } from "@/components/ui";
import { useAgents, useCosmetics, useMaps, useWeapons } from "@/data/queries";
import { useT } from "@/i18n";

/** Cover art and counts for each reference section, taken from the content itself (no bundled media). */
function useSections() {
  const agents = useAgents();
  const maps = useMaps();
  const weapons = useWeapons();
  const bundles = useCosmetics({ kind: "BUNDLE" });
  const standardMaps = maps.data?.filter((m) => m.isStandard);
  return {
    agent: agents.data?.find((a) => a.portraitUrl && a.gradient) ?? agents.data?.[0],
    agentCount: agents.data?.length,
    map: standardMaps?.find((m) => m.splashUrl),
    mapCount: standardMaps?.length,
    weapon: weapons.data?.find((w) => w.category === "RIFLE") ?? weapons.data?.[0],
    weaponCount: weapons.data?.length,
    bundle: bundles.data?.pages[0]?.items[0],
  };
}

/** Reference hub: agents, maps, weapons and cosmetics as one grid of cover cards. */
export default function GuideScreen() {
  const { t } = useT();
  const s = useSections();
  const width = useColumnWidth(2);
  const count = (key: "guide.agentsCount" | "guide.mapsCount" | "guide.weaponsCount", n: number | undefined) => (n ? { subtitle: t(key, { n }) } : {});
  return (
    <Screen>
      <Grid>
        <MediaCard
          width={width}
          aspectRatio={0.85}
          title={t("guide.agents")}
          {...count("guide.agentsCount", s.agentCount)}
          imageUri={s.agent?.portraitUrl ?? s.agent?.iconUrl}
          contentPosition="top center"
          onPress={() => router.push("/agents")}
        />
        <MediaCard
          width={width}
          aspectRatio={0.85}
          title={t("guide.maps")}
          {...count("guide.mapsCount", s.mapCount)}
          imageUri={s.map?.splashUrl}
          onPress={() => router.push("/maps")}
        />
        <MediaCard
          width={width}
          aspectRatio={0.85}
          title={t("guide.weapons")}
          {...count("guide.weaponsCount", s.weaponCount)}
          imageUri={s.weapon?.iconUrl}
          contentFit="contain"
          inset
          onPress={() => router.push("/weapons")}
        />
        <MediaCard
          width={width}
          aspectRatio={0.85}
          title={t("guide.cosmetics")}
          subtitle={t("guide.cosmeticsDetail")}
          imageUri={s.bundle?.thumbnailUrl}
          onPress={() => router.push("/cosmetics")}
        />
      </Grid>
    </Screen>
  );
}
