import { describe, expect, it } from "vitest";
import {
  crosshairGeometry,
  enableAds,
  generateCrosshairCode,
  parseCrosshairCode,
  SNIPER_DEFAULTS,
  sniperColorHex,
  sniperValue,
  type CrosshairSettings,
} from "../src";

describe("sniper scope settings", () => {
  it("parses the sniper center dot from the S section", () => {
    const s = parseCrosshairCode("0;P;c;5;S;c;4;s;0.5;o;1");
    expect(s.sniper).toEqual({ colorIndex: 4, thickness: 0.5, opacity: 1 });
    expect(sniperColorHex(s)).toBe("#FFFF00");
  });

  it("round-trips sniper values it models and passes unknown sniper keys through", () => {
    const code = "0;P;c;5;S;c;8;u;00FFAAFF;s;2;o;0.75;x;7";
    expect(generateCrosshairCode(parseCrosshairCode(code))).toBe(code);
  });

  it("writes only sniper values that were set, so output never depends on guessed defaults", () => {
    const s: CrosshairSettings = { ...parseCrosshairCode("0"), sniper: { opacity: 0.4 } };
    expect(generateCrosshairCode(s)).toBe("0;S;o;0.4");
  });

  it("reads unset sniper values from documented defaults for display", () => {
    expect(sniperValue(parseCrosshairCode("0"), "thickness")).toBe(SNIPER_DEFAULTS.thickness);
  });

  it("rejects out-of-range sniper colors", () => {
    expect(() => parseCrosshairCode("0;S;c;12")).toThrow();
  });
});

describe("ADS profile", () => {
  it("enableAds copies the primary profile so the ADS code starts identical", () => {
    const base = parseCrosshairCode("0;P;c;5;h;0");
    const s = enableAds(base);
    expect(s.ads).toEqual(base.primary);
    expect(s.ads).not.toBe(base.primary);
    expect(generateCrosshairCode(s)).toBe("0;P;c;5;h;0;A");
  });
});

describe("crosshairGeometry", () => {
  const p = parseCrosshairCode("0;P;0l;4;0o;2;0t;2;1b;0").primary;

  it("places four inner arms around the center at the configured offset", () => {
    const arms = crosshairGeometry(p, { firing: 0, moving: 0 }).filter((r) => r.layer === "inner");
    expect(arms).toHaveLength(4);
    const right = arms.find((r) => r.side === "right");
    expect(right).toMatchObject({ x: 2, y: -1, w: 4, h: 2 });
  });

  it("pushes lines outward only when their error setting is on", () => {
    const moving = parseCrosshairCode("0;P;0m;1;0s;2;0f;0").primary;
    const still = crosshairGeometry(moving, { firing: 0, moving: 0 }).find((r) => r.side === "right" && r.layer === "inner")!;
    const move = crosshairGeometry(moving, { firing: 0, moving: 1 }).find((r) => r.side === "right" && r.layer === "inner")!;
    const fire = crosshairGeometry(moving, { firing: 1, moving: 0 }).find((r) => r.side === "right" && r.layer === "inner")!;
    expect(move.x).toBeGreaterThan(still.x);
    expect(fire.x).toBe(still.x);
  });

  it("uses the separate vertical length when enabled", () => {
    const tall = parseCrosshairCode("0;P;0g;1;0v;9;0l;3").primary;
    const top = crosshairGeometry(tall, { firing: 0, moving: 0 }).find((r) => r.layer === "inner" && r.side === "top")!;
    expect(top.h).toBe(9);
  });

  it("omits hidden lines and zero-opacity lines", () => {
    const hidden = parseCrosshairCode("0;P;0b;0;1a;0").primary;
    expect(crosshairGeometry(hidden, { firing: 0, moving: 0 }).filter((r) => r.layer !== "dot")).toHaveLength(0);
  });
});

describe("normalizeCrosshairHex", () => {
  it("accepts 6 or 8 hex digits with or without # and uppercases them", async () => {
    const { normalizeCrosshairHex } = await import("../src");
    expect(normalizeCrosshairHex("#00ffaa")).toBe("00FFAA");
    expect(normalizeCrosshairHex(" 00FFAA80 ")).toBe("00FFAA80");
  });
  it("rejects anything else", async () => {
    const { normalizeCrosshairHex } = await import("../src");
    for (const bad of ["", "fff", "00FFAA8", "GGGGGG", "#00FFAA800"]) expect(normalizeCrosshairHex(bad)).toBeUndefined();
  });
});
