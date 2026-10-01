import { useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";
import { Stack, router } from "expo-router";
import type { SearchBarCommands } from "react-native-screens";
import type { SearchResult } from "@valhub/domain";
import { analytics } from "@/analytics";
import { EmptyState, ErrorState, InlineError, ListRow, RemoteImage, RowGroup, Screen, SearchInput, SectionHeader, SkeletonRows, Text } from "@/components/ui";
import { useSearch } from "@/data/queries";
import { recentSearches } from "@/data/repositories/library";
import { useTheme } from "@/design/theme";
import { useT, type MessageKey } from "@/i18n";
import { presetName } from "@/lib/presets";

function hrefFor(r: SearchResult, t: (key: MessageKey) => string): string {
  switch (r.kind) {
    case "agent":
      return `/agents/${r.item.slug}`;
    case "map":
      return `/maps/${r.item.slug}`;
    case "weapon":
      return `/weapons/${r.item.slug}`;
    case "cosmetic":
      return `/cosmetics/${r.item.id}`;
    case "crosshair":
      return `/crosshairs/editor?code=${encodeURIComponent(r.item.code)}&name=${encodeURIComponent(presetName(t, r.item))}`;
  }
}

function ResultRow({ result, onOpen }: Readonly<{ result: SearchResult; onOpen: () => void }>) {
  const { t } = useT();
  switch (result.kind) {
    case "agent":
      return <ListRow title={result.item.name} subtitle={t(`agent.role.${result.item.role}`)} leading={<RemoteImage uri={result.item.iconUrl} width={36} height={36} />} onPress={onOpen} />;
    case "map":
      return <ListRow title={result.item.name} leading={<RemoteImage uri={result.item.thumbnailUrl} width={56} height={32} />} onPress={onOpen} />;
    case "weapon":
      return <ListRow title={result.item.name} subtitle={t(`weapon.category.${result.item.category}`)} onPress={onOpen} />;
    case "cosmetic":
      return <ListRow title={result.item.name} subtitle={t(`cosmetic.kind.${result.item.kind}`)} leading={<RemoteImage uri={result.item.thumbnailUrl} width={56} height={32} contentFit="contain" />} onPress={onOpen} />;
    case "crosshair":
      return <ListRow title={presetName(t, result.item)} subtitle={result.item.code} onPress={onOpen} />;
  }
}

function resultKey(r: SearchResult): string {
  return `${r.kind}-${r.item.id}`;
}

function RecentSearches({ onPick }: Readonly<{ onPick: (q: string) => void }>) {
  const t = useTheme();
  const { t: tr } = useT();
  const [recent, setRecent] = useState(recentSearches.list);
  if (recent.length === 0) {
    return (
      <Text variant="bodySm" color="textSecondary" style={{ marginTop: t.space[4] }}>
        {tr("search.hint")}
      </Text>
    );
  }
  return (
    <>
      <SectionHeader
        title={tr("search.recent")}
        actionLabel={tr("search.clearRecent")}
        onAction={() => {
          recentSearches.clear();
          setRecent([]);
        }}
      />
      <RowGroup>
        {recent.map((q) => (
          <ListRow key={q} icon="clock" title={q} chevron={false} onPress={() => onPick(q)} />
        ))}
      </RowGroup>
    </>
  );
}

function SearchResults({ query, search }: Readonly<{ query: string; search: ReturnType<typeof useSearch> }>) {
  const t = useTheme();
  const { t: tr } = useT();

  const open = (r: SearchResult) => {
    recentSearches.add(query);
    analytics.track("search_result_opened", { kind: r.kind });
    router.push(hrefFor(r, tr) as never);
  };

  if (search.isLoading) return <SkeletonRows />;
  if (search.isError && !search.data) return <ErrorState code={search.error.code} onRetry={() => void search.refetch()} />;
  if (search.data?.groups.length === 0) return <EmptyState title={tr("search.noResults", { q: query })} message={tr("search.hint")} />;
  return (
    <View>
      {search.data?.degraded.length ? (
        <View style={{ marginTop: t.space[3] }}>
          <InlineError message={tr("search.degraded")} />
        </View>
      ) : null}
      {search.data?.groups.map((g) => (
        <View key={g.kind}>
          <SectionHeader title={tr(`search.groups.${g.kind}`)} />
          <RowGroup>
            {g.results.map((r) => (
              <ResultRow key={resultKey(r)} result={r} onOpen={() => open(r)} />
            ))}
          </RowGroup>
        </View>
      ))}
    </View>
  );
}

const IS_IOS = Platform.OS === "ios";

export default function SearchScreen() {
  const { t: tr } = useT();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const searchBar = useRef<SearchBarCommands>(null);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(id);
  }, [query]);
  const search = useSearch(debounced);

  useEffect(() => {
    if (search.data?.query === debounced && debounced.length >= 2) {
      analytics.track("search_performed", { length: debounced.length, groups: search.data.groups.length });
    }
  }, [search.data, debounced]);

  const pickRecent = (q: string) => {
    searchBar.current?.setText(q);
    setQuery(q);
  };

  return (
    <Screen>
      {IS_IOS ? (
        // The system search field: on iOS 26 it merges into the detached Liquid Glass search tab.
        <Stack.Screen
          options={{
            headerSearchBarOptions: {
              ref: searchBar,
              placeholder: tr("search.placeholder"),
              autoCapitalize: "none",
              hideWhenScrolling: false,
              onChangeText: (e) => setQuery(e.nativeEvent.text),
              onSearchButtonPress: (e) => recentSearches.add(e.nativeEvent.text),
              onCancelButtonPress: () => setQuery(""),
            },
          }}
        />
      ) : (
        <SearchInput label={tr("search.title")} placeholder={tr("search.placeholder")} value={query} onChangeText={setQuery} autoFocus onSubmitEditing={() => recentSearches.add(query)} />
      )}
      {debounced.length < 2 ? <RecentSearches onPick={pickRecent} /> : <SearchResults query={debounced} search={search} />}
    </Screen>
  );
}
