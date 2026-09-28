import { View } from "react-native";
import type { StoreCurrency } from "@valhub/domain";
import { RemoteImage, Text } from "@/components/ui";
import { useCurrencyIcons } from "@/data/queries";
import { useTheme } from "@/design/theme";
import { useT } from "@/i18n";

const CURRENCY_NAME = { VP: "store.vp", KC: "store.kc", RP: "store.rp" } as const;

/** "1.775 Valorant Points" for screen readers. */
export function usePriceText(): (cost: number, currency: StoreCurrency) => string {
  const { t, formatNumber } = useT();
  return (cost, currency) => `${formatNumber(cost)} ${t(CURRENCY_NAME[currency])}`;
}

/** The currency's in-game symbol, tinted to the text color. */
export function CurrencyIcon({ currency, size = 14 }: Readonly<{ currency: StoreCurrency; size?: number }>) {
  const t = useTheme();
  const icons = useCurrencyIcons();
  const uri = icons.data?.[currency];
  if (!uri) return <View style={{ width: size, height: size }} />;
  return <RemoteImage uri={uri} width={size} height={size} contentFit="contain" radius={0} tintColor={t.colors.textPrimary} style={{ backgroundColor: "transparent" }} />;
}

/** Amount with its currency symbol, plus the struck-through original and discount when on sale. */
export function Price({ cost, currency, original, discount }: Readonly<{ cost: number; currency: StoreCurrency; original?: number; discount?: number }>) {
  const t = useTheme();
  const { formatNumber } = useT();
  const spoken = usePriceText()(cost, currency);
  return (
    <View accessible accessibilityLabel={spoken} style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: t.space[2] }}>
      {discount ? (
        <View style={{ backgroundColor: t.colors.accent, borderRadius: t.radius.xs, paddingHorizontal: 6, paddingVertical: 1 }}>
          <Text variant="caption" weight="bold" color="onAccent" numeric>
            −{discount}%
          </Text>
        </View>
      ) : null}
      {original ? (
        <Text variant="bodySm" color="textTertiary" numeric style={{ textDecorationLine: "line-through" }}>
          {formatNumber(original)}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <CurrencyIcon currency={currency} />
        <Text weight="bold" numeric>
          {formatNumber(cost)}
        </Text>
      </View>
    </View>
  );
}
