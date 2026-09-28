import { describe, expect, it } from "vitest";
import {
  AppError,
  MIN_SAMPLE_MATCHES,
  SensitivityInputError,
  cmPer360,
  convertSensitivity,
  edpi,
  groupPerformance,
  headshotPercent,
  httpStatusToErrorCode,
  kdRatio,
  parseRetryAfter,
  randomReactionDelay,
  resolveAppLocale,
  roundTo,
  scoreText,
  sensitivityForNewDpi,
  summarizeReactions,
  tokenize,
  type MatchSummary,
} from "../src";

describe("sensitivity", () => {
  it("computes eDPI", () => {
    expect(edpi(800, 0.35)).toBe(280);
  });

  it("converts VALORANT to CS2 with the 0.07/0.022 yaw ratio", () => {
    expect(roundTo(convertSensitivity("valorant", "cs2", 0.35), 4)).toBe(1.1136);
    expect(roundTo(convertSensitivity("cs2", "valorant", 1.1136), 2)).toBe(0.35);
  });

  it("computes cm/360", () => {
    // 800 DPI, 0.35 sens → 19.6 deg/inch → 18.37 in → 46.65 cm
    expect(roundTo(cmPer360("valorant", 800, 0.35), 2)).toBe(46.65);
  });

  it("keeps eDPI constant across DPI changes", () => {
    expect(sensitivityForNewDpi(800, 0.4, 1600)).toBe(0.2);
  });

  it("rejects non-positive input", () => {
    expect(() => edpi(0, 1)).toThrow(SensitivityInputError);
    expect(() => convertSensitivity("valorant", "cs2", Number.NaN)).toThrow(SensitivityInputError);
  });
});

describe("reaction", () => {
  it("summarizes and discards anticipations", () => {
    expect(summarizeReactions([50, 200, 300, 250])).toEqual({ attempts: 3, bestMs: 200, averageMs: 250, medianMs: 250 });
    expect(summarizeReactions([10])).toBeUndefined();
  });

  it("keeps delays within bounds", () => {
    expect(randomReactionDelay(() => 0)).toBe(1200);
    expect(randomReactionDelay(() => 1)).toBe(4000);
  });
});

describe("stats", () => {
  it("handles zero deaths and empty shots", () => {
    expect(kdRatio(5, 0)).toBe(5);
    expect(headshotPercent(0, 0, 0)).toBeUndefined();
    expect(headshotPercent(1, 3, 0)).toBe(25);
  });

  it("groups performance by key", () => {
    const m = (agentId: string, won: boolean): MatchSummary => ({
      id: Math.random().toString(),
      startedAt: "2026-01-01",
      mapId: "m",
      queue: "competitive",
      agentId,
      won,
      roundsWon: 13,
      roundsLost: 5,
      kills: 10,
      deaths: 5,
      assists: 1,
    });
    const groups = groupPerformance([m("jett", true), m("jett", false), m("sova", true)], (x) => x.agentId);
    expect(groups[0]).toMatchObject({ key: "jett", matches: 2, wins: 1, winRate: 0.5, kd: 2 });
    expect(groups[0]!.matches).toBeLessThan(MIN_SAMPLE_MATCHES);
  });
});

describe("search scoring", () => {
  it("normalizes accents and punctuation", () => {
    expect(tokenize("KAY/O  Breeze!")).toEqual(["kay", "o", "breeze"]);
  });

  it("ranks exact over prefix over substring", () => {
    const q = tokenize("jett");
    expect(scoreText("Jett", q)).toBeGreaterThan(scoreText("Jetty", q));
    expect(scoreText("Jetty", q)).toBeGreaterThan(scoreText("Majettic", q));
    expect(scoreText("Sova", q)).toBe(0);
  });
});

describe("errors & locale", () => {
  it("maps HTTP status to error codes", () => {
    expect(httpStatusToErrorCode(401)).toBe("UNAUTHORIZED");
    expect(httpStatusToErrorCode(429)).toBe("RATE_LIMITED");
    expect(httpStatusToErrorCode(503)).toBe("UPSTREAM");
  });

  it("treats only transient errors as retryable", () => {
    expect(new AppError("TIMEOUT", "x").retryable).toBe(true);
    expect(new AppError("RATE_LIMITED", "x").retryable).toBe(false);
    expect(new AppError("UNAUTHORIZED", "x").retryable).toBe(false);
  });

  it("parses Retry-After seconds and dates", () => {
    expect(parseRetryAfter("12")).toBe(12);
    expect(parseRetryAfter(new Date(1_000_000 + 5_000).toUTCString(), 1_000_000)).toBeLessThanOrEqual(5);
    expect(parseRetryAfter("soon")).toBeUndefined();
  });

  it("resolves device locales", () => {
    expect(resolveAppLocale("tr-TR")).toBe("tr");
    expect(resolveAppLocale("zh-Hant-TW")).toBe("zh-Hant");
    expect(resolveAppLocale("zh-CN")).toBe("zh-Hans");
    expect(resolveAppLocale("pt-PT")).toBe("pt-BR");
    expect(resolveAppLocale("es-419")).toBe("es-MX");
    expect(resolveAppLocale("es-ES")).toBe("es");
    expect(resolveAppLocale("ar-SA")).toBe("ar");
    expect(resolveAppLocale("xx")).toBe("en");
  });
});
