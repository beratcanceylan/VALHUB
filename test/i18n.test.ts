import { SUPPORTED_LOCALES } from "@valhub/domain";
import { en } from "@/i18n/en";
import { CATALOGS, LOCALE_NAMES, translate } from "@/i18n/translate";

function leaves(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => (typeof v === "string" ? [`${prefix}${k}`] : leaves(v as object, `${prefix}${k}.`)));
}

function at(obj: object, key: string): string {
  return key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], obj) as string;
}

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();
}

describe("i18n catalogs", () => {
  it.each(SUPPORTED_LOCALES)("%s covers every English key with the same placeholders", (locale) => {
    const catalog = CATALOGS[locale];
    expect(leaves(catalog).sort()).toEqual(leaves(en).sort());
    for (const key of leaves(en)) {
      expect({ key, p: placeholders(at(catalog, key)) }).toEqual({ key, p: placeholders(at(en, key)) });
    }
  });

  it("names every language in the picker", () => {
    expect(Object.keys(LOCALE_NAMES).sort()).toEqual([...SUPPORTED_LOCALES].sort());
  });

  it("interpolates per locale", () => {
    expect(translate("tr", "common.minutesAgo", { n: 3 })).toBe("3 dk önce");
    expect(translate("de", "common.retry")).toBe("Erneut versuchen");
    expect(translate("ja", "performance.round", { n: 4 })).toBe("ラウンド4");
  });
});
