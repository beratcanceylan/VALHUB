import { describe, expect, it } from "vitest";
import { playValorantAgentHtml, playValorantNewsHtml, providers } from "@valhub/test-fixtures";
import * as S from "@valhub/schemas";
import { extractNextData, parseAgentAbilityVideos, parseArticleCards } from "../src/adapters/playvalorant/next-data";
import type { VapiAgent, VapiMap, VapiWeaponWithSkins } from "../src/adapters/valorant-api/dto";
import { isRealSkin, officialAgentSlug, skinToCosmetic, toAgent, toContentTier, toMap, toMinimapPoint, toWeapon } from "../src/adapters/valorant-api/mapper";

const fetchedAt = "2026-09-26T00:00:00.000Z";

describe("valorant-api mapper", () => {
  const [jett, kayo] = providers.vapiAgents as unknown as VapiAgent[];

  it("maps agents into schema-valid domain entities with ordered slots", () => {
    const agent = toAgent(jett!, fetchedAt);
    expect(S.agentSchema.parse(agent)).toBeTruthy();
    expect(agent.role).toBe("DUELIST");
    expect(agent.abilities.map((a) => a.slot)).toEqual(["C", "Q", "E", "X", "PASSIVE"].filter((s) => agent.abilities.some((a) => a.slot === s)));
    expect(agent.source[0]?.provider).toBe("valorant-api");
  });

  it("derives official page slugs verified against playvalorant.com", () => {
    expect(officialAgentSlug(kayo!.displayName)).toBe("kay-o");
    expect(officialAgentSlug(jett!.displayName)).toBe("jett");
  });

  it("maps maps with normalized callouts and sites", () => {
    const [ascent, range] = providers.vapiMaps as unknown as VapiMap[];
    const map = toMap(ascent!, fetchedAt);
    expect(S.mapSchema.parse(map)).toBeTruthy();
    expect(map.isStandard).toBe(true);
    for (const c of map.callouts) {
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.x).toBeLessThanOrEqual(1);
    }
    expect(toMap(range!, fetchedAt).isStandard).toBe(false);
  });

  it("swaps world axes for minimap coordinates", () => {
    const p = toMinimapPoint({ xMultiplier: 0.1, yMultiplier: 0.2, xScalarToAdd: 0, yScalarToAdd: 0 }, { x: 1, y: 2 });
    expect(p).toEqual({ x: 0.2, y: 0.2 });
  });

  it("maps weapons and filters placeholder skins", () => {
    const vandal = providers.vapiWeapon as unknown as VapiWeaponWithSkins;
    const weapon = toWeapon(vandal, fetchedAt);
    expect(S.weaponSchema.parse(weapon)).toBeTruthy();
    expect(weapon.category).toBe("RIFLE");
    expect(weapon.cost).toBe(2900);
    expect(vandal.skins.filter(isRealSkin)).toHaveLength(1);
    const cosmetic = skinToCosmetic(vandal.skins.find(isRealSkin)!, vandal.uuid, fetchedAt);
    expect(S.cosmeticSchema.parse(cosmetic)).toBeTruthy();
  });
});

describe("skin levels and editions", () => {
  const skin = {
    uuid: "skin",
    displayName: "Prime Vandal",
    displayIcon: null,
    contentTierUuid: "tier",
    chromas: [{ uuid: "c1", displayName: "Prime Vandal", displayIcon: null, fullRender: "https://media.valorant-api.com/c1.png", streamedVideo: null }],
    levels: [
      { uuid: "l1", displayName: "Prime Vandal", displayIcon: null, streamedVideo: null, levelItem: null },
      { uuid: "l2", displayName: "Prime Vandal Level 2", displayIcon: null, streamedVideo: "https://valorant.dyn.riotcdn.net/x/l2.mp4", levelItem: "EEquippableSkinLevelItem::VFX" },
      { uuid: "l3", displayName: "Prime Vandal Level 3", displayIcon: null, streamedVideo: null, levelItem: "EEquippableSkinLevelItem::SomethingNew" },
    ],
  };
  const tier = toContentTier({ uuid: "tier", devName: "Premium", displayName: "PREMIUM EDITION", highlightColor: "d1548dff", displayIcon: "https://media.valorant-api.com/t.png" });
  const cosmetic = skinToCosmetic(skin, "vandal", fetchedAt, tier);

  it("labels what each level unlocks and keeps its preview video", () => {
    expect(cosmetic.levels.map((l) => l.feature)).toEqual([undefined, "VFX", undefined]);
    expect(cosmetic.levels[1]?.videoUrl).toBe("https://valorant.dyn.riotcdn.net/x/l2.mp4");
  });
  it("carries the edition badge", () => {
    expect(cosmetic.tier).toEqual({ id: "tier", name: "Premium", iconUrl: "https://media.valorant-api.com/t.png", color: "#d1548dff" });
    expect(S.cosmeticSchema.parse(cosmetic)).toBeTruthy();
  });
});

describe("playvalorant next-data parsing", () => {
  it("extracts ability videos, preferring mp4", () => {
    const videos = parseAgentAbilityVideos(extractNextData(playValorantAgentHtml()));
    expect(videos).toHaveLength(2);
    expect(videos[0]).toMatchObject({ title: "UPDRAFT", mimeType: "video/mp4" });
    expect(videos[1]?.description).toBe("HOLD JUMP while falling to glide.");
  });

  it("extracts article cards sorted newest first with absolute URLs", () => {
    const articles = parseArticleCards(extractNextData(playValorantNewsHtml()), "https://playvalorant.com");
    expect(articles.map((a) => a.title)).toEqual(["VALORANT Patch Notes 13.06", "VALORANT Patch Notes 13.05"]);
    expect(articles[1]?.url).toBe("https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-13-05");
  });

  it("returns undefined when the page structure is unknown", () => {
    expect(extractNextData("<html></html>")).toBeUndefined();
  });
});
