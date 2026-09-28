import type { MessageKey } from "@/i18n";

type Translate = (key: MessageKey) => string;

const PRESET_KEY: Record<string, string> = {
  "editorial-default": "default",
  "editorial-small-cross": "smallCross",
  "editorial-dot": "dot",
  "editorial-outlined-cross": "outlinedCross",
  "editorial-dynamic": "dynamic",
};

/** Localized name of an editorial crosshair preset (unknown presets keep their own name). */
export function presetName(t: Translate, preset: { id: string; name: string }): string {
  const key = PRESET_KEY[preset.id];
  return key ? t(`crosshair.presetName.${key}` as MessageKey) : preset.name;
}

export function presetTag(t: Translate, tag: string): string {
  const key = `crosshair.tag.${tag}`;
  const label = t(key as MessageKey);
  return label === key ? tag : label;
}
