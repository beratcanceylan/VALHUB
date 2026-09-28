import { useState } from "react";
import { FlatList, View } from "react-native";
import { Stack, router } from "expo-router";
import type { PersonalStore, StoreBundle, StoreOffer } from "@valhub/domain";
import { needsReconnect } from "@/auth/reconnect";
import { useSession } from "@/auth/session";
import { Countdown } from "@/components/domain/Countdown";
import { CapabilityNotice } from "@/components/domain/Notices";
import { OfferCard, OfferPrice } from "@/components/domain/Offer";
import { CurrencyIcon, usePriceText } from "@/components/domain/Price";
import { EmptyState, Grid, HeroCard, QueryView, Screen, SectionHeader, SegmentedControl, Skeleton, Surface, Text, useColumnWidth } from "@/components/ui";
import { usePersonalStore } from "@/data/queries";
import { useTheme } from "@/design/theme";
import { useT } from "@/i18n";

function OfferGrid({ offers }: Readonly<{ offers: StoreOffer[] }>) {
  const width = useColumnWidth(2);
  return (
    <Grid>
      {offers.map((o, i) => (
        <OfferCard key={`${o.id}-${i}`} offer={o} index={i} width={width} />
      ))}
    </Grid>
  );
}

/** A featured collection: its art, total price and a strip of what's inside. */
function FeaturedBundle({ bundle }: Readonly<{ bundle: StoreBundle }>) {
  const t = useTheme();
  const { t: tr } = useT();
  const itemWidth = useColumnWidth(2.4);
  const name = bundle.name ?? tr("store.newItem");
  return (
    <View style={{ gap: t.space[3] }}>
      <HeroCard imageUri={bundle.imageUrl} title={name} height={196} {...(bundle.cosmeticId ? { onPress: () => router.push(`/cosmetics/${bundle.cosmeticId}`) } : {})} />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: t.space[3] }}>
        <OfferPrice offer={bundle} />
        <Countdown until={bundle.endsAt} labelKey="store.endsIn" />
      </View>
      {bundle.items.length > 0 ? (
        <FlatList
          horizontal
          data={bundle.items}
          keyExtractor={(o, i) => `${o.id}-${i}`}
          renderItem={({ item, index }) => <OfferCard offer={item} index={index} width={itemWidth} />}
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -t.space[4] }}
          contentContainerStyle={{ paddingHorizontal: t.space[4], gap: t.space[3] }}
        />
      ) : null}
    </View>
  );
}

function Daily({ s }: Readonly<{ s: PersonalStore }>) {
  const t = useTheme();
  const { t: tr } = useT();
  return (
    <>
      {s.bundles.length > 0 ? (
        <>
          <SectionHeader title={tr("store.featured")} />
          <View style={{ gap: t.space[6] }}>
            {s.bundles.map((b) => (
              <FeaturedBundle key={b.id} bundle={b} />
            ))}
          </View>
        </>
      ) : null}
      <SectionHeader title={tr("store.daily")} trailing={<Countdown until={s.dailyRefreshAt} labelKey="store.refreshesIn" />} />
      <OfferGrid offers={s.daily} />
    </>
  );
}

function Accessories({ accessories }: Readonly<{ accessories: PersonalStore["accessories"] }>) {
  const { t: tr } = useT();
  if (!accessories || accessories.offers.length === 0) {
    return (
      <Surface>
        <EmptyState icon="layers" title={tr("store.emptyAccessories")} />
      </Surface>
    );
  }
  return (
    <>
      <SectionHeader title={tr("store.accessories")} trailing={<Countdown until={accessories.refreshAt} labelKey="store.refreshesIn" />} />
      <OfferGrid offers={accessories.offers} />
    </>
  );
}

type Tab = "daily" | "accessories" | "night";

function StoreBody({ s, tab, onTab }: Readonly<{ s: PersonalStore; tab: Tab; onTab: (tab: Tab) => void }>) {
  const t = useTheme();
  const { t: tr } = useT();
  const options: Array<{ value: Tab; label: string }> = [
    { value: "daily", label: tr("store.daily") },
    { value: "accessories", label: tr("store.accessories") },
    ...(s.nightMarket ? [{ value: "night" as const, label: tr("store.nightMarket") }] : []),
  ];
  // The night market can close while the screen is open.
  const current: Tab = tab === "night" && !s.nightMarket ? "daily" : tab;
  return (
    <>
      <SegmentedControl label={tr("store.title")} value={current} onChange={onTab} options={options} />
      <View style={{ height: t.space[2] }} />
      {current === "daily" ? <Daily s={s} /> : null}
      {current === "accessories" ? <Accessories accessories={s.accessories} /> : null}
      {current === "night" && s.nightMarket ? (
        <>
          <SectionHeader title={tr("store.nightMarket")} trailing={<Countdown until={s.nightMarket.endsAt} labelKey="store.endsIn" />} />
          <OfferGrid offers={s.nightMarket.offers} />
        </>
      ) : null}
    </>
  );
}

function StoreSkeleton() {
  const t = useTheme();
  return (
    <View style={{ gap: t.space[3], marginTop: t.space[4] }}>
      {[0, 1, 2, 3].map((k) => (
        <Skeleton key={k} height={172} radius={t.radius.lg} />
      ))}
    </View>
  );
}

function WalletChip({ amount, currency }: Readonly<{ amount: number; currency: "VP" | "KC" }>) {
  const t = useTheme();
  const { t: tr, formatNumber } = useT();
  const priceText = usePriceText();
  return (
    <View
      accessible
      accessibilityLabel={`${tr("store.wallet")}: ${priceText(amount, currency)}`}
      style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: t.space[3], paddingVertical: 4, borderRadius: t.radius.full, backgroundColor: t.colors.surfaceSunken }}
    >
      <CurrencyIcon currency={currency} />
      <Text variant="bodySm" weight="bold" numeric>
        {formatNumber(amount)}
      </Text>
    </View>
  );
}

/** Module-level factory so the header chip is not a component defined during render. */
function walletHeaderRight(amount: number | undefined, currency: "VP" | "KC") {
  return () => (amount === undefined ? null : <WalletChip amount={amount} currency={currency} />);
}

export default function StoreScreen() {
  const { t: tr } = useT();
  const session = useSession();
  const store = usePersonalStore(session.signedIn);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>("daily");

  const refresh = async () => {
    setRefreshing(true);
    try {
      await store.refetch();
    } finally {
      setRefreshing(false);
    }
  };

  if (!session.signedIn || needsReconnect(store.error)) {
    return (
      <Screen>
        <Stack.Screen options={{ title: tr("store.title") }} />
        <CapabilityNotice
          title={tr("store.title")}
          body={session.signedIn ? tr("auth.expired") : tr("capability.SIGN_IN_REQUIRED")}
          action={{ label: session.signedIn ? tr("auth.reconnect") : tr("common.signIn"), onPress: () => router.push("/auth/riot") }}
        />
      </Screen>
    );
  }

  // Accessories are bought with Kingdom Credits; everything else with VP.
  const walletCurrency = tab === "accessories" ? "KC" : "VP";
  const wallet = walletCurrency === "KC" ? store.data?.walletKc : store.data?.walletVp;
  return (
    <Screen refreshing={refreshing} onRefresh={() => void refresh()}>
      <Stack.Screen options={{ title: tr("store.title"), headerRight: walletHeaderRight(wallet, walletCurrency) }} />
      <QueryView query={store} loading={<StoreSkeleton />}>
        {(s) => <StoreBody s={s} tab={tab} onTab={setTab} />}
      </QueryView>
    </Screen>
  );
}
