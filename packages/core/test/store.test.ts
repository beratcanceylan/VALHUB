import { afterEach, describe, expect, it } from "vitest";
import * as S from "@valhub/schemas";
import type { ContentAdapter } from "../src/adapters/types";
import { TtlCache } from "../src/lib/cache";
import { setFetchImpl } from "../src/lib/http";
import { RiotClientApi, type RiotSession } from "../src/riot-client/api";
import { KC, RP, toPersonalStore, toPriceList, VP } from "../src/riot-client/store";

const dto = {
  FeaturedBundle: {
    Bundles: [
      {
        ID: "bundle-offer",
        DataAssetID: "bundle-asset",
        CurrencyID: VP,
        Items: [
          { Item: { ItemTypeID: "skin", ItemID: "lvl-known", Amount: 1 }, BasePrice: 1775, CurrencyID: VP, DiscountPercent: 0.33, DiscountedPrice: 1189 },
          { Item: { ItemTypeID: "spray", ItemID: "spray-1", Amount: 1 }, BasePrice: 375, CurrencyID: VP, DiscountPercent: 0, DiscountedPrice: 375 },
        ],
        TotalBaseCost: { [VP]: 2150 },
        TotalDiscountedCost: { [VP]: 1564 },
        DurationRemainingInSeconds: 86_400,
      },
    ],
  },
  SkinsPanelLayout: {
    SingleItemStoreOffers: [
      { OfferID: "lvl-known", Cost: { [VP]: 1775 } },
      { OfferID: "lvl-new", Cost: { [VP]: 2175 } },
    ],
    SingleItemOffersRemainingDurationInSeconds: 3600,
  },
  AccessoryStore: {
    AccessoryStoreOffers: [{ Offer: { OfferID: "acc-offer", Cost: { [KC]: 3000 }, Rewards: [{ ItemTypeID: "spray", ItemID: "spray-1", Quantity: 1 }] } }],
    AccessoryStoreRemainingDurationInSeconds: 600,
  },
  BonusStore: {
    BonusStoreOffers: [{ BonusOfferID: "b1", Offer: { OfferID: "lvl-known", Cost: { [VP]: 1775 } }, DiscountPercent: 30, DiscountCosts: { [VP]: 1242 } }],
    BonusStoreRemainingDurationInSeconds: 7200,
  },
};

const levels = new Map([
  ["lvl-known", { kind: "WEAPON_SKIN" as const, name: "Prime Vandal", imageUrl: "https://media.valorant-api.com/x.png", cosmeticId: "skin-prime-vandal" }],
  ["spray-1", { kind: "SPRAY" as const, name: "Nice Spray", cosmeticId: "spray-1" }],
  ["bundle-asset", { kind: "BUNDLE" as const, name: "Prime", imageUrl: "https://media.valorant-api.com/b.png", cosmeticId: "bundle-asset" }],
]);
const now = Date.UTC(2026, 8, 26);

describe("toPersonalStore", () => {
  const store = toPersonalStore(dto, levels, now);

  it("maps daily offers with their VP price, detail link and refresh time", () => {
    expect(store.daily.map((o) => o.cost)).toEqual([1775, 2175]);
    expect(store.daily[0]).toMatchObject({ id: "lvl-known", currency: "VP", name: "Prime Vandal", cosmeticId: "skin-prime-vandal", imageUrl: "https://media.valorant-api.com/x.png" });
    expect(store.dailyRefreshAt).toBe(new Date(now + 3_600_000).toISOString());
  });

  it("keeps items valorant-api does not know yet, without an image", () => {
    expect(store.daily[1]).toMatchObject({ id: "lvl-new", cost: 2175 });
    // No raw UUID as a name: the UI shows a localized "new item" label instead.
    expect(store.daily[1]?.name).toBeUndefined();
    expect(store.daily[1]?.imageUrl).toBeUndefined();
  });

  it("maps the night market with discounts", () => {
    expect(store.nightMarket?.offers[0]).toMatchObject({ cost: 1242, originalCost: 1775, discountPercent: 30, cosmeticId: "skin-prime-vandal" });
    expect(store.nightMarket?.endsAt).toBe(new Date(now + 7_200_000).toISOString());
  });

  it("maps the featured collection with its discounted total and items", () => {
    expect(store.bundles).toHaveLength(1);
    expect(store.bundles[0]).toMatchObject({ name: "Prime", cosmeticId: "bundle-asset", cost: 1564, originalCost: 2150, discountPercent: 27, currency: "VP" });
    expect(store.bundles[0]?.items[0]).toMatchObject({ cost: 1189, originalCost: 1775, discountPercent: 33, cosmeticId: "skin-prime-vandal" });
    expect(store.bundles[0]?.endsAt).toBe(new Date(now + 86_400_000).toISOString());
  });

  it("maps accessories priced in Kingdom Credits by their reward item", () => {
    expect(store.accessories?.offers[0]).toMatchObject({ id: "spray-1", kind: "SPRAY", cost: 3000, currency: "KC", name: "Nice Spray" });
  });

  it("omits the night market when Riot is not running one", () => {
    expect(toPersonalStore({ SkinsPanelLayout: dto.SkinsPanelLayout }, levels, now).nightMarket).toBeUndefined();
  });

  it("is schema-valid", () => {
    expect(S.personalStoreSchema.parse(store)).toBeTruthy();
  });
});

describe("RiotClientApi.storefront", () => {
  afterEach(() => setFetchImpl((...args) => fetch(...args)));

  it("combines storefront, wallet and skin names", async () => {
    const seen: string[] = [];
    setFetchImpl(async (input, init) => {
      const url = String(input);
      seen.push(`${init?.method ?? "GET"} ${url}`);
      const body = /version/.test(url)
        ? { data: { riotClientVersion: "v" } }
        : /storefront/.test(url)
          ? dto
          : /wallet/.test(url)
            ? { Balances: { [VP]: 4200, [KC]: 900 } }
            : {};
      return new Response(JSON.stringify(body), { status: 200 });
    });
    const content = { getCatalogIndex: async () => levels } as unknown as ContentAdapter;
    const session: RiotSession = {
      tokens: { accessToken: "AT", idToken: "IT", expiresAt: Date.now() + 3_600_000 },
      entitlements: "ENT",
      puuid: "p",
      gameName: "",
      tagLine: "",
      region: "eu",
      shard: "eu",
    };
    const store = await new RiotClientApi(content, new TtlCache(10)).storefront(session, "en");
    expect(store.walletVp).toBe(4200);
    expect(store.walletKc).toBe(900);
    expect(store.daily[0]?.name).toBe("Prime Vandal");
    expect(seen).toContain("POST https://pd.eu.a.pvp.net/store/v3/storefront/p");
  });
});

describe("toPriceList", () => {
  it("prices each rewarded item in its own currency", () => {
    const prices = toPriceList({
      Offers: [
        { OfferID: "lvl-1", Cost: { [VP]: 1775 }, Rewards: [{ ItemTypeID: "skin", ItemID: "lvl-1" }] },
        { OfferID: "chroma-offer", Cost: { [RP]: 15 }, Rewards: [{ ItemTypeID: "chroma", ItemID: "chroma-2" }] },
        { OfferID: "unknown", Cost: { other: 5 } },
      ],
    });
    expect(prices).toEqual({ "lvl-1": { cost: 1775, currency: "VP" }, "chroma-2": { cost: 15, currency: "RP" } });
    expect(S.priceListSchema.parse(prices)).toBeTruthy();
  });
});
