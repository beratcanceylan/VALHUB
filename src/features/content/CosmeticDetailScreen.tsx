import { useState } from "react";
import { Pressable, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import type { Cosmetic, CosmeticVariant, ItemPrice, PriceList } from "@valhub/domain";
import { useSession } from "@/auth/session";
import { Price } from "@/components/domain/Price";
import { Button, Icon, ListRow, QueryView, RemoteImage, RemoteVideo, RowGroup, Screen, SectionHeader, Text, useToast } from "@/components/ui";
import { useCosmetic, usePrices } from "@/data/queries";
import { useTheme } from "@/design/theme";
import { useT } from "@/i18n";
import { useFavorite } from "@/lib/useFavorite";

/** Chroma names repeat the skin name ("Prime Vandal Level 4 (Variant 1 Gold)"); keep only what differs. */
function shortName(variant: CosmeticVariant, skinName: string): string {
  const rest = variant.name.replace(skinName, "").replace(/^[\s\-–:]+/, "").trim();
  return rest.replace(/^\((.*)\)$/, "$1") || variant.name;
}

function Stage({ uri, label, portrait }: Readonly<{ uri: string | undefined; label: string; portrait: boolean }>) {
  const t = useTheme();
  return (
    <View
      style={{
        borderRadius: t.radius.lg,
        borderCurve: "continuous",
        overflow: "hidden",
        backgroundColor: t.colors.surfaceSunken,
        experimental_backgroundImage: `radial-gradient(circle at center, ${t.colors.accentSubtle} 0%, ${t.colors.surfaceSunken} 75%)`,
        paddingVertical: t.space[5],
        paddingHorizontal: t.space[4],
      }}
    >
      <RemoteImage uri={uri} width="100%" aspectRatio={portrait ? 0.5 : 2.4} contentFit="contain" radius={0} label={label} style={{ backgroundColor: "transparent" }} />
    </View>
  );
}

function TierBadge({ tier }: Readonly<{ tier: NonNullable<Cosmetic["tier"]> }>) {
  const t = useTheme();
  const { t: tr } = useT();
  return (
    <View
      accessible
      accessibilityLabel={`${tr("cosmetic.tier")}: ${tier.name}`}
      style={{ flexDirection: "row", alignItems: "center", gap: t.space[1], alignSelf: "flex-start", paddingHorizontal: t.space[2], paddingVertical: 2, borderRadius: t.radius.full, backgroundColor: t.colors.surfaceSunken }}
    >
      {tier.iconUrl ? <RemoteImage uri={tier.iconUrl} width={16} height={16} contentFit="contain" radius={0} style={{ backgroundColor: "transparent" }} /> : null}
      <Text variant="caption" weight="semibold" label>
        {tier.name}
      </Text>
    </View>
  );
}

/** Store price of the skin (its first level), or a nudge to connect Riot for prices. */
function BasePrice({ price, signedIn }: Readonly<{ price: ItemPrice | undefined; signedIn: boolean }>) {
  const t = useTheme();
  const { t: tr } = useT();
  if (price) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: t.space[2] }}>
        <Price cost={price.cost} currency={price.currency} />
      </View>
    );
  }
  if (signedIn) return null;
  return (
    <Pressable accessibilityRole="link" onPress={() => router.push("/auth/riot")} hitSlop={8} style={{ flexShrink: 1 }}>
      <Text variant="bodySm" color="accent" align="right">
        {tr("cosmetic.pricesSignIn")}
      </Text>
    </Pressable>
  );
}

/** Upgrade cost of a chroma or level; the first one ships with the skin. */
function UpgradeCost({ variant, index, prices }: Readonly<{ variant: CosmeticVariant; index: number; prices: PriceList | undefined }>) {
  const { t } = useT();
  if (index === 0) {
    return (
      <Text variant="bodySm" color="textTertiary">
        {t("cosmetic.included")}
      </Text>
    );
  }
  const price = prices?.[variant.id];
  return price ? <Price cost={price.cost} currency={price.currency} /> : null;
}

function Swatch({ variant, label, selected, onPress }: Readonly<{ variant: CosmeticVariant; label: string; selected: boolean; onPress: () => void }>) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={4}
      style={{
        width: 52,
        height: 52,
        padding: 3,
        borderRadius: t.radius.md,
        borderCurve: "continuous",
        borderWidth: t.borderWidth.thick,
        borderColor: selected ? t.colors.accent : "transparent",
      }}
    >
      <RemoteImage uri={variant.swatchUrl ?? variant.imageUrl} width="100%" height={42} radius={t.radius.sm} contentFit="cover" />
    </Pressable>
  );
}

function Chromas({ c, selected, onSelect, prices }: Readonly<{ c: Cosmetic; selected: number; onSelect: (i: number) => void; prices: PriceList | undefined }>) {
  const t = useTheme();
  const { t: tr } = useT();
  const current = c.chromas[selected];
  if (c.chromas.length < 2 || !current) return null;
  return (
    <>
      <SectionHeader title={tr("cosmetic.chromas")} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.space[2] }}>
        {c.chromas.map((v, i) => (
          <Swatch key={v.id} variant={v} label={shortName(v, c.name)} selected={i === selected} onPress={() => onSelect(i)} />
        ))}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: t.space[3], marginTop: t.space[2] }}>
        <Text weight="semibold" style={{ flex: 1 }} numberOfLines={2}>
          {shortName(current, c.name)}
        </Text>
        <UpgradeCost variant={current} index={selected} prices={prices} />
      </View>
      {current.videoUrl ? (
        <View style={{ marginTop: t.space[3] }}>
          <RemoteVideo key={current.id} uri={current.videoUrl} label={current.name} />
        </View>
      ) : null}
    </>
  );
}

/** Every level with what it unlocks and its cost; tapping one plays its preview below the list. */
function Levels({ c, prices }: Readonly<{ c: Cosmetic; prices: PriceList | undefined }>) {
  const t = useTheme();
  const { t: tr } = useT();
  const [open, setOpen] = useState<number | undefined>(undefined);
  if (c.levels.length < 2 && !c.levels[0]?.videoUrl) return null;
  const playing = open === undefined ? undefined : c.levels[open];
  return (
    <>
      <SectionHeader title={tr("cosmetic.levels")} />
      <RowGroup>
        {c.levels.map((level, i) => {
          const selected = open === i;
          return (
            <ListRow
              key={level.id}
              title={tr("cosmetic.level", { n: i + 1 })}
              subtitle={level.feature ? tr(`cosmetic.feature.${level.feature}`) : tr("cosmetic.baseLevel")}
              chevron={false}
              trailing={
                <View style={{ flexDirection: "row", alignItems: "center", gap: t.space[3] }}>
                  <UpgradeCost variant={level} index={i} prices={prices} />
                  {level.videoUrl ? <Icon name={selected ? "check" : "play"} size={18} color={selected ? "accent" : "textSecondary"} /> : null}
                </View>
              }
              {...(level.videoUrl ? { onPress: () => setOpen(selected ? undefined : i), accessibilityHint: tr("media.play", { name: tr("cosmetic.level", { n: i + 1 }) }) } : {})}
            />
          );
        })}
      </RowGroup>
      {playing?.videoUrl ? (
        <View style={{ marginTop: t.space[3] }}>
          <RemoteVideo key={playing.id} uri={playing.videoUrl} label={playing.name} autoPlay />
        </View>
      ) : null}
    </>
  );
}

function Detail({ c }: Readonly<{ c: Cosmetic }>) {
  const t = useTheme();
  const { t: tr } = useT();
  const toast = useToast();
  const session = useSession();
  const prices = usePrices(session.signedIn);
  const fav = useFavorite("COSMETIC", c.id, c.name);
  const [chroma, setChroma] = useState(0);
  const image = c.chromas[chroma]?.imageUrl ?? c.imageUrl;
  const firstLevel = c.levels[0];
  const basePrice = prices.data?.[firstLevel?.id ?? c.id];

  return (
    <>
      <Stack.Screen options={{ title: c.name }} />
      <Stage uri={image} label={c.name} portrait={c.kind === "PLAYER_CARD"} />
      {/* The name is already the screen title; the stage is followed by edition and price only. */}
      <View style={{ gap: t.space[2], marginTop: t.space[4] }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: t.space[3] }}>
          {c.tier ? <TierBadge tier={c.tier} /> : <View />}
          <BasePrice price={basePrice} signedIn={session.signedIn} />
        </View>
        {c.description ? (
          <Text variant="bodySm" color="textSecondary">
            {c.description}
          </Text>
        ) : null}
      </View>
      <Button
        label={fav.saved ? tr("cosmetic.inWishlist") : tr("cosmetic.addWishlist")}
        icon={fav.saved ? "check" : "plus"}
        variant={fav.saved ? "secondary" : "primary"}
        haptic
        style={{ marginTop: t.space[4] }}
        onPress={() => toast(fav.toggle() ? tr("cosmetic.inWishlist") : tr("common.remove"))}
      />
      <Chromas c={c} selected={chroma} onSelect={setChroma} prices={prices.data} />
      <Levels c={c} prices={prices.data} />
    </>
  );
}

export function CosmeticDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cosmetic = useCosmetic(id);
  return (
    <Screen>
      <QueryView query={cosmetic}>{(c) => <Detail c={c} />}</QueryView>
    </Screen>
  );
}
