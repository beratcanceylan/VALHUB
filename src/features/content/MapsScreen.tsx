import { Stack, router } from "expo-router";
import { View } from "react-native";
import { HeroCard, QueryView, Screen } from "@/components/ui";
import { useMaps } from "@/data/queries";
import { useTheme } from "@/design/theme";
import { useT } from "@/i18n";

export default function MapsScreen() {
  const theme = useTheme();
  const { t } = useT();
  const maps = useMaps();
  return (
    <Screen>
      <Stack.Screen options={{ title: t("learn.maps") }} />
      <QueryView query={maps}>
        {(list) => {
          const standard = list.filter((m) => m.isStandard);
          return (
            <View style={{ gap: theme.space[3] }}>
              {standard.map((m) => (
                <HeroCard key={m.id} imageUri={m.splashUrl ?? m.thumbnailUrl} title={m.name} height={168} onPress={() => router.push(`/maps/${m.slug}`)} />
              ))}
            </View>
          );
        }}
      </QueryView>
    </Screen>
  );
}
