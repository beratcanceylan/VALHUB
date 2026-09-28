import type { CrosshairSummary } from "@valhub/domain";

export interface CrosshairPresetRecord extends CrosshairSummary {
  attribution?: string;
}

/**
 * Editorial crosshair presets. Every preset needs provenance; these are authored by VALHUB
 * itself (they are settings, not game media), so they ship with the app.
 */
export const EDITORIAL_CROSSHAIRS: readonly CrosshairPresetRecord[] = [
  { id: "editorial-default", name: "Game default", code: "0", tags: ["default"], attribution: "VALHUB editorial" },
  { id: "editorial-small-cross", name: "Compact cross", code: "0;P;c;5;h;0;0l;4;0o;2;0a;1;0f;0;1b;0", tags: ["cross", "static"], attribution: "VALHUB editorial" },
  { id: "editorial-dot", name: "Dot only", code: "0;P;c;1;h;0;d;1;z;3;0b;0;1b;0", tags: ["dot", "static"], attribution: "VALHUB editorial" },
  { id: "editorial-outlined-cross", name: "Outlined white cross", code: "0;P;h;1;o;1;0l;3;0o;2;0a;1;0f;0;1b;0", tags: ["cross", "outlines"], attribution: "VALHUB editorial" },
  { id: "editorial-dynamic", name: "Dynamic with error", code: "0;P;c;4;0l;4;0o;3;0a;1;0m;1;1l;2;1o;6;1a;0.5", tags: ["dynamic"], attribution: "VALHUB editorial" },
];

export function listCrosshairPresets(tag?: string): CrosshairPresetRecord[] {
  return EDITORIAL_CROSSHAIRS.filter((p) => !tag || p.tags.includes(tag));
}
