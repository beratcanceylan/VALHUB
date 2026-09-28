import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { getPreference, setPreference as persistPreference } from "@/data/cache/db";
import { ThemeProvider, type ThemePreference } from "./theme";

const PreferenceContext = createContext<{ preference: ThemePreference; setThemePreference: (p: ThemePreference) => void } | null>(null);

export function AppearanceProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [preference, setPreference] = useState<ThemePreference>(() => getPreference<ThemePreference>("theme", "system"));
  const setThemePreference = useCallback((p: ThemePreference) => {
    persistPreference("theme", p);
    setPreference(p);
  }, []);
  const value = useMemo(() => ({ preference, setThemePreference }), [preference, setThemePreference]);
  return (
    <PreferenceContext.Provider value={value}>
      <ThemeProvider preference={preference}>{children}</ThemeProvider>
    </PreferenceContext.Provider>
  );
}

export function useAppearance() {
  const value = useContext(PreferenceContext);
  if (!value) throw new Error("useAppearance must be used inside AppearanceProvider");
  return value;
}
