export type SourceProvider =
  | "riot"
  | "playvalorant"
  | "valorant-wiki"
  | "valorant-api"
  | "communitydragon"
  | "henrik"
  | "internal";

/**
 * Provenance attached to every piece of content that did not originate in our own
 * database. Wiki-derived material MUST carry `license` and `sourceUrl`.
 */
export interface SourceRef {
  provider: SourceProvider;
  sourceUrl?: string;
  fetchedAt: string;
  revision?: string;
  license?: string;
  attribution?: string;
}

export interface Page<T> {
  items: T[];
  nextCursor?: string;
  total?: number;
}

/** Every language the VALORANT client ships in. */
export const SUPPORTED_LOCALES = [
  "en",
  "tr",
  "de",
  "fr",
  "es",
  "es-MX",
  "it",
  "pl",
  "pt-BR",
  "ru",
  "ar",
  "id",
  "th",
  "vi",
  "ja",
  "ko",
  "zh-Hans",
  "zh-Hant",
] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

/** Upstream providers use Riot-style `xx-YY` locale codes. */
export const RIOT_LOCALE: Record<AppLocale, string> = {
  en: "en-US",
  tr: "tr-TR",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
  "es-MX": "es-MX",
  it: "it-IT",
  pl: "pl-PL",
  "pt-BR": "pt-BR",
  ru: "ru-RU",
  ar: "ar-AE",
  id: "id-ID",
  th: "th-TH",
  vi: "vi-VN",
  ja: "ja-JP",
  ko: "ko-KR",
  "zh-Hans": "zh-CN",
  "zh-Hant": "zh-TW",
};

export function isAppLocale(value: string): value is AppLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** Resolves an arbitrary BCP-47 tag to the closest supported locale. */
export function resolveAppLocale(tag: string | undefined | null): AppLocale {
  if (!tag) return "en";
  if (isAppLocale(tag)) return tag;
  const lower = tag.toLowerCase();
  if (lower.startsWith("pt")) return "pt-BR";
  // Latin American Spanish (es-MX, es-419, es-AR…) uses Riot's es-MX; Spain keeps es.
  if (lower.startsWith("es")) return lower === "es" || /^es[-_]es/.test(lower) ? "es" : "es-MX";
  if (lower.startsWith("zh")) {
    return /hant|tw|hk|mo/.test(lower) ? "zh-Hant" : "zh-Hans";
  }
  const base = lower.split(/[-_]/)[0] ?? "en";
  return isAppLocale(base) ? base : "en";
}
