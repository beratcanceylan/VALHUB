import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { playValorantAgentHtml, playValorantNewsHtml, providers } from "@valhub/test-fixtures";
import { AppError } from "@valhub/domain";
import { ValorantApiContentAdapter } from "../src/adapters/valorant-api/adapter";
import { PlayValorantAdapter } from "../src/adapters/playvalorant/adapter";
import { TtlCache } from "../src/lib/cache";
import { setFetchImpl } from "../src/lib/http";
import { KC, RP, VP } from "../src/riot-client/store";

const weapon = providers.vapiWeapon as { uuid: string; skins: Array<{ uuid: string; levels: Array<{ uuid: string }>; chromas: Array<{ uuid: string }> }> };
const [standardSkin, premiumSkin] = weapon.skins;

const VAPI: Record<string, unknown> = {
  "/v1/agents": providers.vapiAgents,
  "/v1/maps": providers.vapiMaps,
  "/v1/weapons": [providers.vapiWeapon],
  "/v1/bundles": [{ uuid: "bundle-1", displayName: "Araxys", description: null, displayIcon: "https://media/b1.png", displayIcon2: null }],
  "/v1/buddies": [{ uuid: "buddy-1", displayName: "Lucky Buddy", displayIcon: "https://media/bd.png", levels: [{ uuid: "buddy-1-lv1", displayName: "Lucky", displayIcon: null }] }],
  "/v1/playercards": [{ uuid: "card-1", displayName: "Card", displayIcon: "https://media/c.png", largeArt: null, wideArt: "https://media/cw.png" }],
  "/v1/sprays": [{ uuid: "spray-1", displayName: "Spray", displayIcon: "https://media/s.png", fullTransparentIcon: null }],
  "/v1/playertitles": [
    { uuid: "title-1", displayName: "Title", titleText: "The Best" },
    { uuid: "title-2", displayName: null, titleText: null },
  ],
  "/v1/contenttiers": [{ uuid: "12683d76-48d7-84a3-4e09-6985794f0445", devName: "Ultra", displayName: "Ultra Edition", highlightColor: "fad663ff", displayIcon: "https://media/t.png" }],
  "/v1/currencies": [
    { uuid: VP, displayIcon: "https://media/vp.png" },
    { uuid: KC, displayIcon: "https://media/kc.png" },
    { uuid: RP, displayIcon: null },
  ],
  "/v1/seasons": [
    { uuid: "episode", displayName: "E9", type: null, startTime: "2026-01-01T00:00:00Z", endTime: "2027-01-01T00:00:00Z" },
    { uuid: "act-3", displayName: "ACT III", type: "EAresSeasonType::Act", startTime: "2026-08-01T00:00:00Z", endTime: "2026-11-01T00:00:00Z" },
  ],
  "/v1/competitivetiers": [
    { uuid: "old", tiers: [{ tier: 21, tierName: "OLD", smallIcon: null }] },
    { uuid: "new", tiers: [{ tier: 21, tierName: "IMMORTAL 1", smallIcon: null }] },
  ],
};

let requests: string[] = [];
let failing = new Set<string>();

function respond(body: string, type: string, status = 200): Response {
  return new Response(body, { status, headers: { "content-type": type } });
}

beforeEach(() => {
  requests = [];
  failing = new Set();
  setFetchImpl(async (input) => {
    const url = new URL(String(input));
    requests.push(url.pathname + url.search);
    if (failing.has(url.pathname)) return respond("down", "text/plain", 404);
    if (url.host === "valorant-api.com") {
      const data = VAPI[url.pathname];
      return data ? respond(JSON.stringify({ status: 200, data }), "application/json") : respond("{}", "application/json", 404);
    }
    if (url.pathname.includes("/agents/")) return respond(playValorantAgentHtml(), "text/html");
    if (url.pathname.includes("/news/")) return respond(playValorantNewsHtml(), "text/html");
    return respond("<html></html>", "text/html");
  });
});

afterEach(() => setFetchImpl((...args) => fetch(...args)));

describe("ValorantApiContentAdapter", () => {
  const adapter = () => new ValorantApiContentAdapter(new TtlCache());

  it("lists and resolves agents, maps and weapons with localized requests", async () => {
    const a = adapter();
    const agents = await a.getAgents("tr");
    expect(agents.map((x) => x.name)).toEqual(["Jett", "KAY/O"]);
    expect(requests[0]).toContain("language=tr-TR");
    expect((await a.getAgent("kay-o", "en")).name).toBe("KAY/O");
    await expect(a.getAgent("nobody", "en")).rejects.toBeInstanceOf(AppError);

    expect((await a.getMaps("en")).length).toBeGreaterThan(0);
    expect((await a.getMap("7eaecc1b-4337-bbf6-6ab9-04b8f06b3319", "en")).name).toBe("Ascent");
    await expect(a.getMap("missing", "en")).rejects.toBeInstanceOf(AppError);
    expect(await a.resolveMapAssetPath("/Game/Maps/Ascent/Ascent")).toBe("7eaecc1b-4337-bbf6-6ab9-04b8f06b3319");

    expect((await a.getWeapons("en"))[0]?.name).toBe("Vandal");
    expect((await a.getWeapon(weapon.uuid, "en")).name).toBe("Vandal");
    await expect(a.getWeapon("missing", "en")).rejects.toBeInstanceOf(AppError);
  });

  it("pages and filters cosmetics and resolves each kind", async () => {
    const a = adapter();
    const all = await a.getCosmetics({ limit: 1 }, "en");
    expect(all.items).toHaveLength(1);
    expect(all.nextCursor).toBe("1");
    const next = await a.getCosmetics({ limit: 100, cursor: all.nextCursor }, "en");
    expect(next.items.length).toBe((all.total ?? 0) - 1);
    expect((await a.getCosmetics({ kind: "SPRAY", q: "spr" }, "en")).items.map((c) => c.id)).toEqual(["spray-1"]);
    expect((await a.getCosmetics({ weaponId: "other" }, "en")).total).toBe(0);

    const skin = await a.getCosmetic(premiumSkin!.uuid, "en");
    expect(skin.kind).toBe("WEAPON_SKIN");
    for (const id of ["bundle-1", "buddy-1", "card-1", "spray-1"]) expect((await a.getCosmetic(id, "en")).id).toBe(id);
    await expect(a.getCosmetic("missing", "en")).rejects.toBeInstanceOf(AppError);
  });

  it("keeps skins visible when the content tier lookup fails", async () => {
    const a = adapter();
    failing.add("/v1/contenttiers");
    expect((await a.getCosmetic(premiumSkin!.uuid, "en")).name).toBe("Immortalized Vandal");
  });

  it("indexes every sellable item id for the store", async () => {
    const index = await adapter().getCatalogIndex("en");
    expect(index.get(standardSkin!.levels[0]!.uuid)?.kind).toBe("WEAPON_SKIN");
    expect(index.get(standardSkin!.chromas[0]!.uuid)?.cosmeticId).toBe(standardSkin!.uuid);
    expect(index.get("buddy-1-lv1")).toMatchObject({ kind: "BUDDY", cosmeticId: "buddy-1" });
    expect(index.get("card-1")?.imageUrl).toBe("https://media/cw.png");
    expect(index.get("title-1")).toEqual({ kind: "TITLE", name: "The Best" });
    expect(index.has("title-2")).toBe(false);
    expect(index.get("bundle-1")?.imageUrl).toBe("https://media/b1.png");
  });

  it("reads currencies, the current act and tier names", async () => {
    const a = adapter();
    expect(await a.getCurrencyIcons()).toEqual({ VP: "https://media/vp.png", KC: "https://media/kc.png" });
    expect(await a.getCurrentActId(Date.parse("2026-09-28T00:00:00Z"))).toBe("act-3");
    expect(await a.getCurrentActId(Date.parse("2020-01-01T00:00:00Z"))).toBeUndefined();
    expect(await a.getTierName(21, "en")).toBe("IMMORTAL 1");
    expect(await a.getTierName(99, "en")).toBeUndefined();
  });

  it("reports the upstream as down after a failure", async () => {
    const a = adapter();
    expect(a.capabilities()[0]?.available).toBe(true);
    failing.add("/v1/agents");
    await expect(a.getAgents("en")).rejects.toBeDefined();
    expect(a.capabilities()[0]).toMatchObject({ available: false, reason: "UPSTREAM_DOWN" });
  });
});

describe("PlayValorantAdapter", () => {
  it("reads ability videos and news from official pages", async () => {
    const adapter = new PlayValorantAdapter(new TtlCache());
    const media = await adapter.getAgentMedia("Jett!", "zh-Hans");
    expect(requests[0]).toBe("/zh-tw/agents/jett/");
    expect(media.abilities[0]).toMatchObject({ abilityName: "UPDRAFT", mimeType: "video/mp4" });
    expect(media.source.provider).toBe("playvalorant");

    const news = await adapter.getNews("game-updates", "tr");
    expect(news.map((n) => n.title)).toEqual(["VALORANT Patch Notes 13.06", "VALORANT Patch Notes 13.05"]);
    expect(news[1]).toMatchObject({ imageUrl: expect.any(String), category: "Game Updates" });
    expect((await adapter.getNews("all", "en")).length).toBe(2);
    expect(adapter.capabilities().every((c) => c.available)).toBe(true);
  });

  it("fails loudly when the page structure is unknown", async () => {
    const adapter = new PlayValorantAdapter(new TtlCache());
    await expect(adapter.getAgentMedia("unknown", "en").then(() => adapter.getNews("all", "en"))).resolves.toBeDefined();
    const broken = new PlayValorantAdapter(new TtlCache());
    setFetchImpl(async () => respond("<html>no data</html>", "text/html"));
    await expect(broken.getNews("all", "en")).rejects.toBeInstanceOf(AppError);
    expect(broken.capabilities()[0]).toMatchObject({ available: false });
  });
});
