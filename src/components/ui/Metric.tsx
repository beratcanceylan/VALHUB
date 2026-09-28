import { View } from "react-native";
import { useTheme } from "@/design/theme";
import { Text } from "./Text";

export function Metric({ label, value, detail }: Readonly<{ label: string; value: string; detail?: string }>) {
  const t = useTheme();
  const spoken = [`${label}: ${value}`, detail].filter(Boolean).join(", ");
  return (
    <View accessible accessibilityLabel={spoken} style={{ flex: 1, gap: 2, minWidth: 72 }}>
      <Text variant="caption" color="textSecondary" label numberOfLines={2}>
        {label}
      </Text>
      <Text variant="titleSm" weight="semibold" numeric numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
      {detail ? (
        <Text variant="caption" color="textTertiary" numeric numberOfLines={2}>
          {detail}
        </Text>
      ) : null}
      <View style={{ height: t.space[1] }} />
    </View>
  );
}

/** Signed delta rendered with explicit sign and words, never color alone. */
export function TrendValue({ value, format, positiveIsGood = true, label }: Readonly<{ value: number; format: (v: number) => string; positiveIsGood?: boolean; label: string }>) {
  const sign = Math.sign(value);
  const symbol = { [-1]: "−", 0: "±", 1: "+" }[sign] ?? "±";
  let color: "textSecondary" | "positive" | "negative" = "textSecondary";
  if (sign !== 0) color = (sign > 0) === positiveIsGood ? "positive" : "negative";
  return (
    <Text
      variant="bodySm"
      weight="semibold"
      numeric
      color={color}
      accessibilityLabel={`${label} ${symbol}${format(Math.abs(value))}`}
    >
      {symbol}
      {format(Math.abs(value))}
    </Text>
  );
}
