import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { getLocales, getCalendars } from "expo-localization";
import { resolveAppLocale, type AppLocale } from "@valhub/domain";
import { getPreference, setPreference } from "@/data/cache/db";
import { translate, type MessageKey } from "./translate";

export type { MessageKey } from "./translate";

interface I18nValue {
  locale: AppLocale;
  setLocale: (locale: AppLocale | "system") => void;
  preference: AppLocale | "system";
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
  formatNumber: (value: number, fractionDigits?: number) => string;
  formatDateTime: (iso: string, options?: Intl.DateTimeFormatOptions) => string;
  formatRelative: (timestamp: number) => string;
  timeZone: string;
}

const DEFAULT_DATE_TIME: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" };

const I18nContext = createContext<I18nValue | null>(null);

function systemLocale(): AppLocale {
  return resolveAppLocale(getLocales()[0]?.languageTag);
}

export function I18nProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [preference, setPreferenceState] = useState<AppLocale | "system">(() => getPreference<AppLocale | "system">("locale", "system"));
  const locale = preference === "system" ? systemLocale() : preference;
  const timeZone = getCalendars()[0]?.timeZone ?? "UTC";

  const setLocale = useCallback((next: AppLocale | "system") => {
    setPreference("locale", next);
    setPreferenceState(next);
  }, []);

  const value = useMemo<I18nValue>(() => {
    const t = (key: MessageKey, params?: Record<string, string | number>) => translate(locale, key, params);
    // Intl formatters are expensive to construct; build each distinct one once per locale/time zone.
    const numberFormats = new Map<number, Intl.NumberFormat>();
    const numberFormat = (digits: number) => {
      let f = numberFormats.get(digits);
      if (!f) {
        f = new Intl.NumberFormat(locale, { maximumFractionDigits: digits, minimumFractionDigits: digits });
        numberFormats.set(digits, f);
      }
      return f;
    };
    const dateTimeFormats = new Map<string, Intl.DateTimeFormat>();
    const dateTimeFormat = (options: Intl.DateTimeFormatOptions) => {
      const cacheKey = JSON.stringify(options);
      let f = dateTimeFormats.get(cacheKey);
      if (!f) {
        f = new Intl.DateTimeFormat(locale, { ...options, timeZone });
        dateTimeFormats.set(cacheKey, f);
      }
      return f;
    };
    return {
      locale,
      preference,
      setLocale,
      t,
      timeZone,
      formatNumber: (v, digits = 0) => numberFormat(digits).format(v),
      formatDateTime: (iso, options = DEFAULT_DATE_TIME) => dateTimeFormat(options).format(new Date(iso)),
      formatRelative: (ts) => {
        const diff = Math.max(0, Date.now() - ts);
        const min = Math.floor(diff / 60_000);
        if (min < 1) return t("common.justNow");
        if (min < 60) return t("common.minutesAgo", { n: min });
        const h = Math.floor(min / 60);
        if (h < 24) return t("common.hoursAgo", { n: h });
        return t("common.daysAgo", { n: Math.floor(h / 24) });
      },
    };
  }, [locale, preference, setLocale, timeZone]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useT must be used inside I18nProvider");
  return value;
}

export function useLocale(): AppLocale {
  return useT().locale;
}
