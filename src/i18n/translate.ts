import type { AppLocale } from "@valhub/domain";
import { en, type Messages } from "./en";
import { ar } from "./ar";
import { de } from "./de";
import { es } from "./es";
import { esMX } from "./es-MX";
import { fr } from "./fr";
import { id } from "./id";
import { it } from "./it";
import { ja } from "./ja";
import { ko } from "./ko";
import { pl } from "./pl";
import { ptBR } from "./pt-BR";
import { ru } from "./ru";
import { th } from "./th";
import { tr } from "./tr";
import { vi } from "./vi";
import { zhHans } from "./zh-Hans";
import { zhHant } from "./zh-Hant";

/** Every language the VALORANT client ships in, each fully translated (no fallback). */
export const CATALOGS: Record<AppLocale, Messages> = {
  en,
  tr,
  de,
  fr,
  es,
  "es-MX": esMX,
  it,
  pl,
  "pt-BR": ptBR,
  ru,
  ar,
  id,
  th,
  vi,
  ja,
  ko,
  "zh-Hans": zhHans,
  "zh-Hant": zhHant,
};

type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type MessageKey = Leaves<Messages>;

function lookup(catalog: Messages | undefined, key: string): string | undefined {
  let node: unknown = catalog;
  for (const part of key.split(".")) {
    if (node && typeof node === "object" && part in node) node = (node as Record<string, unknown>)[part];
    else return undefined;
  }
  return typeof node === "string" ? node : undefined;
}

export function translate(locale: AppLocale, key: MessageKey, params?: Record<string, string | number>): string {
  const raw = lookup(CATALOGS[locale], key) ?? lookup(en, key) ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) => (params[name] !== undefined ? String(params[name]) : `{${name}}`));
}

/** Each language in its own script, as the game's language menu shows it. */
export const LOCALE_NAMES: Record<AppLocale, string> = {
  en: "English",
  tr: "Türkçe",
  de: "Deutsch",
  fr: "Français",
  es: "Español (España)",
  "es-MX": "Español (Latinoamérica)",
  it: "Italiano",
  pl: "Polski",
  "pt-BR": "Português (Brasil)",
  ru: "Русский",
  ar: "العربية",
  id: "Bahasa Indonesia",
  th: "ไทย",
  vi: "Tiếng Việt",
  ja: "日本語",
  ko: "한국어",
  "zh-Hans": "简体中文",
  "zh-Hant": "繁體中文",
};
