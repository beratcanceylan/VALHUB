import { useState } from "react";
import { FlatList, View } from "react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useQueryClient } from "@tanstack/react-query";
import type { NewsArticle } from "@valhub/domain";
import { useSession } from "@/auth/session";
import { Countdown } from "@/components/domain/Countdown";
import { MatchRow } from "@/components/domain/rows";
import { OfferCard } from "@/components/domain/Offer";
import { Button, Carousel, HeroCard, QueryView, RowGroup, Screen, SectionHeader, Skeleton, Surface, Text, useColumnWidth } from "@/components/ui";
import { useAgents, useMaps, useMyMatches, useNews, usePersonalStore } from "@/data/queries";
import { useTheme } from "@/design/theme";
import { useT } from "@/i18n";
import { useCapability } from "@/lib/capabilities";

function ConnectPrompt() {
  const theme = useTheme();
  const { t } = useT();
  const identity = useCapability("PLAYER_IDENTITY");
  if (!identity?.available) return null;
  return (
    <Surface padded style={{ marginTop: theme.space[6] }}>
      <Text weight="semibold">{t("home.connectTitle")}</Text>
      <Text variant="bodySm" color="textSecondary" style={{ marginTop: theme.space[1], marginBottom: theme.space[3] }}>
        {t("home.connectBody")}
      </Text>
      <Button label={t("common.signIn")} variant="secondary" size="sm" style={{ alignSelf: "flex-start" }} onPress={() => router.push("/auth/riot")} />
    </Surface>
  );
}

function LatestMatch() {
  const { t } = useT();
  const matches = useMyMatches(true);
  const agents = useAgents();
  const maps = useMaps();
  const latest = matches.data?.pages[0]?.items[0];
  if (!latest) return null;
  const agent = agents.data?.find((a) => a.id === latest.agentId);
  const mapName = maps.data?.find((m) => m.id === latest.mapId)?.name;
  return (
    <>
      <SectionHeader title={t("home.latestMatch")} />
      <RowGroup>
        <MatchRow match={latest} {...(agent ? { agent } : {})} {...(mapName ? { mapName } : {})} onPress={() => router.push(`/matches/${latest.id}`)} />
      </RowGroup>
    </>
  );
}

/** Today's offers at a glance; the header opens the full store (its only entry point). */
function StorePreview() {
  const t = useTheme();
  const { t: tr } = useT();
  const store = usePersonalStore(true);
  const width = useColumnWidth(2.4);
  const s = store.data;
  return (
    <>
      <SectionHeader title={tr("store.title")} actionLabel={tr("common.seeAll")} onAction={() => router.push("/store")} />
      {s ? (
        <>
          <FlatList
            horizontal
            data={s.daily}
            keyExtractor={(o, i) => `${o.id}-${i}`}
            renderItem={({ item, index }) => <OfferCard offer={item} index={index} width={width} />}
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -t.space[4] }}
            contentContainerStyle={{ paddingHorizontal: t.space[4], gap: t.space[3] }}
          />
          <View style={{ marginTop: t.space[2] }}>
            <Countdown until={s.dailyRefreshAt} labelKey="store.refreshesIn" />
          </View>
        </>
      ) : (
        <Skeleton height={150} radius={t.radius.lg} />
      )}
    </>
  );
}

function FeaturedArticle({ article }: Readonly<{ article: NewsArticle }>) {
  const { formatDateTime } = useT();
  return (
    <HeroCard
      imageUri={article.imageUrl}
      eyebrow={article.category ?? formatDateTime(article.publishedAt, { dateStyle: "medium" })}
      title={article.title}
      {...(article.description ? { subtitle: article.description } : {})}
      height={240}
      onPress={() => void WebBrowser.openBrowserAsync(article.url)}
    />
  );
}

const articleKey = (a: NewsArticle) => a.id;
const renderArticle = (a: NewsArticle) => <FeaturedArticle article={a} />;

function Featured() {
  const theme = useTheme();
  const { t } = useT();
  const news = useNews("game-updates");
  return (
    <QueryView query={news} compactError loading={<Skeleton height={240} radius={theme.radius.lg + 4} />}>
      {(articles) =>
        articles.length > 0 ? <Carousel label={t("home.featured")} data={articles.slice(0, 4)} keyExtractor={articleKey} renderItem={renderArticle} /> : null
      }
    </QueryView>
  );
}

export default function HomeScreen() {
  const queryClient = useQueryClient();
  const session = useSession();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.refetchQueries({ type: "active" });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Screen refreshing={refreshing} onRefresh={() => void refresh()}>
      <Featured />
      {session.signedIn ? (
        <>
          <StorePreview />
          <LatestMatch />
        </>
      ) : (
        <ConnectPrompt />
      )}
    </Screen>
  );
}
