import { createContext, useContext, useMemo, type ReactNode } from "react";
import { Platform, useColorScheme } from "react-native";
import {
  darkColors,
  fontSize,
  fontSizeIOS,
  lightColors,
  lineHeight,
  lineHeightIOS,
  tokens,
  type ColorScheme,
  type SemanticColors,
  type Tokens,
  type TypeVariant,
} from "@valhub/design-tokens";

export type ThemePreference = "system" | ColorScheme;

export interface Theme extends Omit<Tokens, "fontSize" | "lineHeight"> {
  scheme: ColorScheme;
  colors: SemanticColors;
  fontSize: Readonly<Record<TypeVariant, number>>;
  lineHeight: Readonly<Record<TypeVariant, number>>;
}

const ThemeContext = createContext<Theme | null>(null);

const IS_IOS = Platform.OS === "ios";

function resolveScheme(preference: ThemePreference, system: string | null | undefined): ColorScheme {
  if (preference !== "system") return preference;
  return system === "dark" ? "dark" : "light";
}

export function ThemeProvider({ preference, children }: Readonly<{ preference: ThemePreference; children: ReactNode }>) {
  const system = useColorScheme();
  const scheme = resolveScheme(preference, system);
  const theme = useMemo<Theme>(
    () => ({
      ...tokens,
      scheme,
      colors: scheme === "dark" ? darkColors : lightColors,
      fontSize: IS_IOS ? fontSizeIOS : fontSize,
      lineHeight: IS_IOS ? lineHeightIOS : lineHeight,
    }),
    [scheme],
  );
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useTheme must be used inside ThemeProvider");
  return theme;
}
