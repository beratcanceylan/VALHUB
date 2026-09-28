import { useMemo, useState } from "react";
import { View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { HaloText, Minimap } from "@/components/domain/Minimap";
import { ChipRow, FilterChip, HeroCard, QueryView, Screen } from "@/components/ui";
import { useMap } from "@/data/queries";
import { useTheme } from "@/design/theme";
import { useT } from "@/i18n";

export default function MapDetailScreen() {
  const t = useTheme();
  const { t: tr } = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const map = useMap(id);
  const [region, setRegion] = useState<string | undefined>(undefined);
  const regions = useMemo(() => [...new Set((map.data?.callouts ?? []).map((c) => c.region))], [map.data]);
  const regionLabel = (r: string) => {
    const key = `map.region.${r}` as const;
    const label = tr(key as never);
    return label === key ? r : label;
  };

  return (
    <Screen>
      <QueryView query={map}>
        {(m) => {
          const callouts = m.callouts.filter((c) => !region || c.region === region);
          return (
            <>
              <Stack.Screen options={{ title: m.name }} />
              <HeroCard
                imageUri={m.splashUrl ?? m.overviewImageUrl}
                title={m.name}
                {...(m.tacticalDescription ? { subtitle: m.tacticalDescription } : {})}
                {...(m.sites.length > 0 ? { eyebrow: tr("map.sitesCount", { n: m.sites.length }) } : {})}
                height={240}
              />
              <View style={{ height: t.space[4] }} />
              <ChipRow>
                <FilterChip label={tr("common.any")} selected={!region} onPress={() => setRegion(undefined)} />
                {regions.map((r) => (
                  <FilterChip key={r} label={regionLabel(r)} selected={region === r} onPress={() => setRegion(region === r ? undefined : r)} />
                ))}
              </ChipRow>
              <View style={{ height: t.space[3] }} />
              <Minimap uri={m.minimapImageUrl} label={tr("map.minimap", { name: m.name, count: callouts.length })}>
                {(size) =>
                  callouts.map((c) => (
                    <HaloText key={`${c.region}-${c.name}`} x={c.x * size} y={c.y * size} text={c.name} fill={t.colors.textPrimary} halo={t.colors.background} />
                  ))
                }
              </Minimap>

            </>
          );
        }}
      </QueryView>
    </Screen>
  );
}
