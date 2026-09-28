import { describe, expect, it } from "vitest";
import {
  CrosshairCodeError,
  crosshairColorHex,
  defaultCrosshairSettings,
  generateCrosshairCode,
  isValidCrosshairCode,
  parseCrosshairCode,
} from "../src";

describe("parseCrosshairCode", () => {
  it("parses the default code to defaults", () => {
    expect(parseCrosshairCode("0")).toEqual(defaultCrosshairSettings());
  });

  it("parses primary settings, lines and outlines", () => {
    const s = parseCrosshairCode("0;P;c;5;h;0;0l;4;0o;2;0a;1;0f;0;1b;0");
    expect(s.primary.colorIndex).toBe(5);
    expect(s.primary.outlines).toBe(false);
    expect(s.primary.inner).toMatchObject({ length: 4, offset: 2, opacity: 1, firingError: false });
    expect(s.primary.outer.show).toBe(false);
    expect(crosshairColorHex(s.primary)).toBe("#00FFFF");
  });

  it("supports custom colors", () => {
    const s = parseCrosshairCode("0;P;c;8;u;FF8800FF");
    expect(crosshairColorHex(s.primary)).toBe("#FF8800FF");
  });

  it("creates an ADS profile that inherits primary, then overrides", () => {
    const s = parseCrosshairCode("0;P;c;1;0l;3;A;c;7");
    expect(s.ads?.colorIndex).toBe(7);
    expect(s.ads?.inner.length).toBe(3);
  });

  it("keeps unknown keys for lossless roundtrips", () => {
    const code = "0;s;1;P;c;1;zz;9;S;d;1";
    const s = parseCrosshairCode(code);
    expect(s.extra.G).toEqual({ s: "1" });
    expect(s.extra.P).toEqual({ zz: "9" });
    expect(s.extra.S).toEqual({ d: "1" });
    expect(parseCrosshairCode(generateCrosshairCode(s))).toEqual(s);
  });

  it.each([
    ["", "EMPTY"],
    ["1;P;c;1", "VERSION"],
    ["0;P;c", "SHAPE"],
    ["0;P;h;2", "VALUE"],
    ["0;P;c;12", "VALUE"],
    ["0;P;0l;abc", "VALUE"],
    ["0;P;c;8;u;XYZ", "VALUE"],
  ])("rejects %j with %s", (code, reason) => {
    try {
      parseCrosshairCode(code);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(CrosshairCodeError);
      expect((e as CrosshairCodeError).reason).toBe(reason);
    }
    expect(isValidCrosshairCode(code)).toBe(false);
  });
});

describe("generateCrosshairCode", () => {
  it("omits defaults", () => {
    expect(generateCrosshairCode(defaultCrosshairSettings())).toBe("0");
  });

  it.each([
    "0;P;c;5;h;0;0l;4;0o;2;0a;1;0f;0;1b;0",
    "0;P;c;1;h;0;d;1;z;3;0b;0;1b;0",
    "0;P;h;1;o;1;0l;3;0o;2;0a;1;0f;0;1b;0",
    "0;P;c;4;0l;4;0o;3;0a;1;0m;1;1l;2;1o;6;1a;0.5",
    "0;P;c;8;u;11AA33FF;0t;1;0l;2",
    "0;P;c;1;A;c;7;0l;9",
  ])("roundtrips %s", (code) => {
    const parsed = parseCrosshairCode(code);
    const regenerated = generateCrosshairCode(parsed);
    expect(parseCrosshairCode(regenerated)).toEqual(parsed);
  });
});
