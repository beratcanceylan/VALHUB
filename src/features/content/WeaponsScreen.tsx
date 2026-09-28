import { useState } from "react";
import { FlatList, View, type ListRenderItem } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import type { CosmeticSummary, WeaponCategory } from "@valhub/domain";
import { ChipRow, Divider, FilterChip, Grid, Metric, QueryView, RemoteImage, Screen, SectionHeader, ShowcaseCard, Surface, Text, useColumnWidth } from "@/components/ui";
import { useCosmetics, useWeapon, useWeapons } from "@/data/queries";
import { useTheme } from "@/design/theme";
import { useT } from "@/i18n";

const CATEGORY_ORDER: WeaponCategory[] = ["SIDEARM", "SMG", "SHOTGUN", "RIFLE", "SNIPER", "HEAVY", "MELEE"];

function WeaponCost({ cost }: Readonly<{ cost: number | undefined }>) {
  const { t, formatNumber } = useT();
  return (
    <Text variant="caption" color="textSecondary" numeric>
      {cost ? `¤ ${formatNumber(cost)}` : t("weapon.free")}
    </Text>
  );
}

export function WeaponsScreen() {
  const theme = useTheme();
  const { t } = useT();
  const weapons = useWeapons();
  const [category, setCategory] = useState<WeaponCategory | undefined>(undefined);
  const width = useColumnWidth(2);
  const categories = CATEGORY_ORDER.filter((c) => weapons.data?.some((w) => w.category === c));
  return (
    <Screen>
      <Stack.Screen options={{ title: t("learn.weapons") }} />
      <ChipRow>
        <FilterChip label={t("agent.filterAll")} selected={!category} onPress={() => setCategory(undefined)} />
        {categories.map((c) => (
          <FilterChip key={c} label={t(`weapon.category.${c}`)} selected={category === c} onPress={() => setCategory(category === c ? undefined : c)} />
        ))}
      </ChipRow>
      <View style={{ height: theme.space[3] }} />
      <QueryView query={weapons}>
        {(list) => (
          <Grid>
            {list
              .filter((w) => !category || w.category === category)
              .map((w) => (
                <ShowcaseCard
                  key={w.id}
                  width={width}
                  imageUri={w.iconUrl}
                  title={w.name}
                  meta={<WeaponCost cost={w.cost} />}
                  onPress={() => router.push(`/weapons/${w.slug}`)}
                />
              ))}
          </Grid>
        )}
      </QueryView>
    </Screen>
  );
}

function SkinCard({ skin }: Readonly<{ skin: CosmeticSummary }>) {
  const width = useColumnWidth(2.3);
  return <ShowcaseCard width={width} imageAspectRatio={1.6} imageUri={skin.thumbnailUrl} title={skin.name} onPress={() => router.push(`/cosmetics/${skin.id}`)} />;
}

const skinKey = (c: CosmeticSummary) => c.id;
const renderSkin: ListRenderItem<CosmeticSummary> = ({ item }) => <SkinCard skin={item} />;

function WeaponSkins({ weaponId }: Readonly<{ weaponId: string }>) {
  const t = useTheme();
  const { t: tr } = useT();
  const skins = useCosmetics({ kind: "WEAPON_SKIN", weaponId });
  const items = skins.data?.pages[0]?.items.slice(0, 8) ?? [];
  if (items.length === 0) return null;
  const openAll = () => router.push({ pathname: "/cosmetics", params: { weaponId, kind: "WEAPON_SKIN" } });
  return (
    <>
      <SectionHeader title={tr("weapon.skins")} actionLabel={tr("common.seeAll")} onAction={openAll} />
      <FlatList
        horizontal
        data={items}
        keyExtractor={skinKey}
        renderItem={renderSkin}
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -t.space[4] }}
        contentContainerStyle={{ paddingHorizontal: t.space[4], gap: t.space[3] }}
      />
    </>
  );
}

export function WeaponDetailScreen() {
  const t = useTheme();
  const { t: tr, formatNumber } = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const weapon = useWeapon(id);
  return (
    <Screen>
      <QueryView query={weapon}>
        {(w) => (
          <>
            <Stack.Screen options={{ title: w.name }} />
            <View style={{ backgroundColor: t.colors.surface, borderRadius: t.radius.lg + 4, borderCurve: "continuous", padding: t.space[5], gap: t.space[3] }}>
              <RemoteImage uri={w.iconUrl} width="100%" aspectRatio={3} contentFit="contain" label={w.name} style={{ backgroundColor: "transparent" }} />
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: t.space[2] }}>
                <Text variant="caption" label color="accent" style={{ flexShrink: 1 }} numberOfLines={1}>
                  {tr(`weapon.category.${w.category}`)}
                </Text>
                <WeaponCost cost={w.cost} />
              </View>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.space[3], marginTop: t.space[4] }}>
              {w.fireRate !== undefined ? <Metric label={tr("weapon.fireRate")} value={tr("weapon.fireRateValue", { n: formatNumber(w.fireRate, 2) })} /> : null}
              {w.magazineSize !== undefined ? <Metric label={tr("weapon.magazine")} value={String(w.magazineSize)} /> : null}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.space[3], marginTop: t.space[2] }}>
              {w.reloadSeconds !== undefined ? <Metric label={tr("weapon.reload")} value={tr("weapon.seconds", { n: formatNumber(w.reloadSeconds, 2) })} /> : null}
              {w.equipSeconds !== undefined ? <Metric label={tr("weapon.equip")} value={tr("weapon.seconds", { n: formatNumber(w.equipSeconds, 2) })} /> : null}
              {w.wallPenetration ? <Metric label={tr("weapon.penetration")} value={tr(`weapon.pen.${w.wallPenetration}`)} /> : null}
            </View>

            {w.damageRanges.length > 0 ? (
              <>
                <SectionHeader title={tr("weapon.damage")} />
                <Surface>
                  <View style={{ flexDirection: "row", paddingHorizontal: t.space[4], paddingVertical: t.space[2] }}>
                    <Text variant="caption" color="textSecondary" label style={{ flex: 2 }}>
                      {" "}
                    </Text>
                    {(["head", "body", "leg"] as const).map((k) => (
                      <Text key={k} variant="caption" color="textSecondary" label style={{ flex: 1 }} align="right">
                        {tr(`weapon.${k}`)}
                      </Text>
                    ))}
                  </View>
                  {w.damageRanges.map((r) => (
                    <View key={r.startMeters}>
                      <Divider />
                      <View
                        accessible
                        accessibilityLabel={`${tr("weapon.range", { start: r.startMeters, end: r.endMeters })}: ${tr("weapon.head")} ${formatNumber(r.head)}, ${tr("weapon.body")} ${formatNumber(r.body)}, ${tr("weapon.leg")} ${formatNumber(r.leg)}`}
                        style={{ flexDirection: "row", paddingHorizontal: t.space[4], paddingVertical: t.space[3] }}
                      >
                        <Text numeric style={{ flex: 2 }}>
                          {tr("weapon.range", { start: r.startMeters, end: r.endMeters })}
                        </Text>
                        {(["head", "body", "leg"] as const).map((k) => (
                          <Text key={k} numeric weight="semibold" style={{ flex: 1 }} align="right">
                            {formatNumber(r[k])}
                          </Text>
                        ))}
                      </View>
                    </View>
                  ))}
                </Surface>
              </>
            ) : null}

            <WeaponSkins weaponId={w.id} />
          </>
        )}
      </QueryView>
    </Screen>
  );
}
