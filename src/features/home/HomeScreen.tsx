import { useState } from "react";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useQueryClient } from "@tanstack/react-query";
import type { NewsArticle } from "@valhub/domain";
import { HeroCard, ListRow, QueryView, RemoteImage, RowGroup, Screen, SectionHeader, Skeleton, type IconName } from "@/components/ui";
import { useNews } from "@/data/queries";
import { useTheme } from "@/design/theme";
import { useT, type MessageKey } from "@/i18n";

const openArticle = (a: NewsArticle) => void WebBrowser.openBrowserAsync(a.url);

function FeaturedArticle({ article }: Readonly<{ article: NewsArticle }>) {
  const { formatDateTime } = useT();
  return (
    <HeroCard
      imageUri={article.imageUrl}
      eyebrow={formatDateTime(article.publishedAt, { dateStyle: "medium" })}
      title={article.title}
      {...(article.description ? { subtitle: article.description } : {})}
      height={240}
      onPress={() => openArticle(article)}
    />
  );
}

const LIST_COUNT = 6;

function News() {
  const theme = useTheme();
  const { t, formatDateTime } = useT();
  const news = useNews("game-updates");
  return (
    <QueryView query={news} compactError loading={<Skeleton height={240} radius={theme.radius.md} />}>
      {([featured, ...rest]) => (
        <>
          {featured ? <FeaturedArticle article={featured} /> : null}
          {rest.length > 0 ? (
            <>
              <SectionHeader title={t("home.news")} />
              <RowGroup>
                {rest.slice(0, LIST_COUNT).map((a) => (
                  <ListRow
                    key={a.id}
                    title={a.title}
                    subtitle={formatDateTime(a.publishedAt, { dateStyle: "medium" })}
                    leading={<RemoteImage uri={a.imageUrl} width={64} height={44} />}
                    onPress={() => openArticle(a)}
                  />
                ))}
              </RowGroup>
            </>
          ) : null}
        </>
      )}
    </QueryView>
  );
}

const TOOLS: readonly { icon: IconName; label: MessageKey; href: string }[] = [
  { icon: "crosshair", label: "library.crosshairs", href: "/crosshairs" },
  { icon: "gauge", label: "library.sensitivity", href: "/tools/sensitivity" },
  { icon: "timer", label: "library.reaction", href: "/tools/reaction" },
];

function QuickTools() {
  const { t } = useT();
  return (
    <>
      <SectionHeader title={t("library.tools")} />
      <RowGroup>
        {TOOLS.map((tool) => (
          <ListRow key={tool.href} icon={tool.icon} title={t(tool.label)} onPress={() => router.push(tool.href as never)} />
        ))}
      </RowGroup>
    </>
  );
}

/** Public, account-free start page: official news and quick tools. Account features live on the Account tab. */
export default function HomeScreen() {
  const queryClient = useQueryClient();
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
      <News />
      <QuickTools />
    </Screen>
  );
}
