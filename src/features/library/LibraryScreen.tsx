import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import type { Favorite } from "@valhub/domain";
import { ListRow, RowGroup, Screen, SectionHeader, type IconName } from "@/components/ui";
import { favorites, savedCrosshairs, strategies } from "@/data/repositories/library";
import { useT, type MessageKey } from "@/i18n";

interface Counts {
  wishlist: Favorite[];
  agents: Favorite[];
  crosshairs: number;
  strategies: number;
}

function load(): Counts {
  return {
    wishlist: favorites.list("COSMETIC"),
    agents: favorites.list("AGENT"),
    crosshairs: savedCrosshairs.list().length,
    strategies: strategies.list().length,
  };
}

interface HubItem {
  icon: IconName;
  label: MessageKey;
  href: string;
  detail?: string;
}

export default function LibraryScreen() {
  const { t } = useT();
  const [data, setData] = useState<Counts>(load);
  useFocusEffect(useCallback(() => setData(load()), []));
  const count = (n: number) => (n > 0 ? t("library.count", { n }) : t("library.empty"));

  const saved: HubItem[] = [
    { icon: "crosshair", label: "library.crosshairs", href: "/crosshairs", detail: count(data.crosshairs) },
    { icon: "pencil", label: "library.strategies", href: "/strategy", detail: count(data.strategies) },
    { icon: "layers", label: "library.wishlist", href: "/library/wishlist", detail: count(data.wishlist.length) },
    { icon: "user", label: "library.agents", href: "/library/agents", detail: count(data.agents.length) },
  ];
  const tools: HubItem[] = [
    { icon: "gauge", label: "library.sensitivity", href: "/tools/sensitivity" },
    { icon: "timer", label: "library.reaction", href: "/tools/reaction" },
  ];
  const renderRows = (items: HubItem[]) => (
    <RowGroup>
      {items.map((item) => (
        <ListRow key={item.href} icon={item.icon} title={t(item.label)} {...(item.detail ? { subtitle: item.detail } : {})} onPress={() => router.push(item.href as never)} />
      ))}
    </RowGroup>
  );

  return (
    <Screen>
      <SectionHeader title={t("library.saved")} first />
      {renderRows(saved)}
      <SectionHeader title={t("library.tools")} />
      {renderRows(tools)}
    </Screen>
  );
}
