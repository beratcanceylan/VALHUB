import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from "react-native";
import type { ColorToken, TypeVariant } from "@valhub/design-tokens";
import { useTheme } from "@/design/theme";

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  color?: ColorToken;
  weight?: "regular" | "medium" | "semibold" | "bold";
  /** Tabular numerals for stats so columns align. */
  numeric?: boolean;
  /** Small uppercase label style. */
  label?: boolean;
  align?: TextStyle["textAlign"];
}

export function Text({ variant = "body", color = "textPrimary", weight = "regular", numeric, label, align, style, ...rest }: Readonly<TextProps>) {
  const t = useTheme();
  return (
    <RNText
      maxFontSizeMultiplier={2}
      {...rest}
      style={[
        {
          fontSize: t.fontSize[variant],
          lineHeight: t.lineHeight[variant],
          color: t.colors[color],
          fontWeight: t.fontWeight[weight],
        },
        numeric && { fontVariant: ["tabular-nums"] },
        label && { textTransform: "uppercase", letterSpacing: t.letterSpacing.label, fontWeight: t.fontWeight.semibold },
        align && { textAlign: align },
        style,
      ]}
    />
  );
}
