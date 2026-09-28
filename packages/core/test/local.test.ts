import { describe, expect, it } from "vitest";
import * as S from "@valhub/schemas";
import { buildBootstrap, localCapabilities } from "../src/services/local";

const byName = (signedIn: boolean) => new Map(localCapabilities({ signedIn }).map((c) => [c.capability, c]));

describe("localCapabilities", () => {
  it("enables keyless content without any network", () => {
    const caps = byName(false);
    expect(caps.get("GAME_CONTENT")?.available).toBe(true);
    expect(caps.get("NEWS")?.available).toBe(true);
    expect(caps.get("PLAYER_IDENTITY")?.available).toBe(true);
  });
  it("gates Riot account features on a session", () => {
    expect(byName(false).get("MATCHES")).toMatchObject({ available: false, reason: "SIGN_IN_REQUIRED" });
    expect(byName(true).get("PERSONAL_STORE")?.available).toBe(true);
    expect(byName(true).get("LEADERBOARD")?.available).toBe(true);
  });
  it("keeps AUDIO rights-blocked", () => {
    const caps = byName(true);
    expect(caps.get("AUDIO")).toMatchObject({ available: false, reason: "RIGHTS_UNCLEARED" });
  });
  it("emits schema-valid states for every capability", () => {
    const all = localCapabilities({ signedIn: false });
    expect(all).toHaveLength(9);
    for (const c of all) expect(S.capabilityStateSchema.parse(c)).toBeTruthy();
  });
});

describe("buildBootstrap", () => {
  it("is built offline and lists media hosts", () => {
    const b = buildBootstrap({ locale: "tr", signedIn: false });
    expect(b.locale).toBe("tr");
    expect(b.allowedMediaHosts).toContain("media.valorant-api.com");
    expect(b.attribution.riotLegal).toMatch(/not endorsed by Riot Games/);
  });
});
