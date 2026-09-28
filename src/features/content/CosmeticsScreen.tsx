import { useCallback, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { FlashList, type ListRenderItem } from "@shopify/flash-list";
import type { CosmeticKind, CosmeticSummary } from "@valhub/domain";
import { ChipRow, EmptyState, ErrorState, FilterChip, ListBottomSpacer, SearchInput, ShowcaseCard, SkeletonRows, Text, useColumnWidth } from "@/components/ui";
import { useCosmetics } from "@/data/queries";
import { asAppError } from "@/data/client";
import { useTheme } from "@/design/theme";
import { useT } from "@/i18n";

const KINDS: CosmeticKind[] = ["BUNDLE", "WEAPON_SKIN", "BUDDY", "PLAYER_CARD", "SPRAY"];

const openCosmetic = (item: CosmeticSummary) => router.push(`/cosmetics/${item.id}`);

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

function CosmeticKindLabel({ kind }: Readonly<{ kind: CosmeticKind }>) {
  const { t } = useT();
  return (
    <Text variant="caption" color="textSecondary">
      {t(`cosmetic.kind.${kind}`)}
    </Text>
  );
}

function CosmeticResults({ query, items }: Readonly<{ query: ReturnType<typeof useCosmetics>; items: CosmeticSummary[] }>) {
  const t = useTheme();
  const { t: tr } = useT();
  const width = useColumnWidth(2);
  const renderCosmetic = useCallback<ListRenderItem<CosmeticSummary>>(
    ({ item, index }) => (
      // Two columns: the left cell carries the gutter, the right cell the inner gap.
      <View style={{ paddingLeft: index % 2 === 0 ? t.space[4] : t.space[3] / 2, paddingRight: index % 2 === 0 ? t.space[3] / 2 : t.space[4], paddingBottom: t.space[3] }}>
        <ShowcaseCard width={width} imageUri={item.thumbnailUrl} imageAspectRatio={1.5} title={item.name} meta={<CosmeticKindLabel kind={item.kind} />} onPress={() => openCosmetic(item)} />
      </View>
    ),
    [t, width],
  );
  if (query.isLoading) {
    return (
      <View style={{ paddingHorizontal: t.space[4] }}>
        <SkeletonRows />
      </View>
    );
  }
  if (query.isError && items.length === 0) {
    return <ErrorState code={asAppError(query.error).code} onRetry={() => void query.refetch()} />;
  }
  return (
    <FlashList
      data={items}
      numColumns={2}
      keyExtractor={(c) => c.id}
      renderItem={renderCosmetic}
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="on-drag"
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={<EmptyState title={tr("cosmetic.empty")} />}
      ListFooterComponent={ListBottomSpacer}
    />
  );
}

export function CosmeticsScreen() {
  const t = useTheme();
  const { t: tr } = useT();
  const params = useLocalSearchParams<{ kind?: string; weaponId?: string }>();
  const [kind, setKind] = useState<CosmeticKind>((KINDS as string[]).includes(params.kind ?? "") ? (params.kind as CosmeticKind) : "BUNDLE");
  const [q, setQ] = useState("");
  const debounced = useDebounced(q, 300);
  const query = useCosmetics({ kind, ...(debounced ? { q: debounced } : {}), ...(params.weaponId ? { weaponId: params.weaponId } : {}) });
  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <Stack.Screen options={{ title: tr("learn.cosmetics") }} />
      <View style={{ paddingHorizontal: t.space[4], paddingTop: t.space[2], gap: t.space[2] }}>
        <SearchInput label={tr("cosmetic.searchPlaceholder")} placeholder={tr("cosmetic.searchPlaceholder")} value={q} onChangeText={setQ} />
        <ChipRow>
          {KINDS.map((k) => (
            <FilterChip key={k} label={tr(`cosmetic.kind.${k}`)} selected={kind === k} onPress={() => setKind(k)} />
          ))}
        </ChipRow>
      </View>
      <CosmeticResults query={query} items={items} />
    </View>
  );
}
