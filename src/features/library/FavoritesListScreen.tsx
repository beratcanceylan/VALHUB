import { useCallback, useState } from "react";
import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import type { Favorite, FavoriteEntityType } from "@valhub/domain";
import { EmptyState, ListRow, RowGroup, Screen, Surface } from "@/components/ui";
import { favorites } from "@/data/repositories/library";
import { useT, type MessageKey } from "@/i18n";

const KINDS: Record<string, { type: FavoriteEntityType; title: MessageKey; href: (id: string) => string }> = {
  wishlist: { type: "COSMETIC", title: "library.wishlist", href: (id) => `/cosmetics/${id}` },
  agents: { type: "AGENT", title: "library.agents", href: (id) => `/agents/${id}` },
};

export default function FavoritesListScreen() {
  const { kind } = useLocalSearchParams<{ kind: string }>();
  const { t } = useT();
  const config = KINDS[kind ?? ""];
  const [items, setItems] = useState<Favorite[]>([]);
  useFocusEffect(useCallback(() => setItems(config ? favorites.list(config.type) : []), [config]));

  return (
    <Screen>
      <Stack.Screen options={{ title: config ? t(config.title) : "" }} />
      {items.length === 0 || !config ? (
        <Surface>
          <EmptyState icon="saved" title={t("library.empty")} />
        </Surface>
      ) : (
        <RowGroup>
          {items.map((f) => (
            <ListRow key={f.id} title={f.label ?? f.entityId} onPress={() => router.push(config.href(f.entityId) as never)} />
          ))}
        </RowGroup>
      )}
    </Screen>
  );
}
