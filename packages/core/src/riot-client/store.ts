import type { ItemPrice, PersonalStore, PriceList, StoreBundle, StoreCurrency, StoreOffer } from "@valhub/domain";
import type { CatalogItem } from "../adapters/types";

/** Currency ids used by the store. */
export const VP = "85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741";
export const KC = "85ca954a-41f2-ce94-9b45-8ca3dd39a00d";
export const RP = "e59aa87c-4cbf-517a-5983-6e81511be9b7";

const CURRENCIES: ReadonlyArray<[string, StoreCurrency]> = [
  [VP, "VP"],
  [KC, "KC"],
  [RP, "RP"],
];

interface DtoReward {
  ItemTypeID: string;
  ItemID: string;
  Quantity?: number;
}

interface DtoOffer {
  OfferID: string;
  Cost: Record<string, number>;
  Rewards?: DtoReward[];
}

interface DtoBundleItem {
  Item: { ItemTypeID: string; ItemID: string; Amount?: number };
  BasePrice: number;
  CurrencyID: string;
  DiscountPercent?: number;
  DiscountedPrice?: number;
}

interface DtoBundle {
  ID: string;
  DataAssetID: string;
  CurrencyID: string;
  Items: DtoBundleItem[] | null;
  TotalBaseCost?: Record<string, number> | null;
  TotalDiscountedCost?: Record<string, number> | null;
  TotalDiscountPercent?: number;
  DurationRemainingInSeconds: number;
}

export interface DtoStorefront {
  FeaturedBundle?: { Bundles?: DtoBundle[] | null; Bundle?: DtoBundle | null };
  SkinsPanelLayout: { SingleItemStoreOffers: DtoOffer[]; SingleItemOffersRemainingDurationInSeconds: number };
  AccessoryStore?: {
    AccessoryStoreOffers: Array<{ Offer: DtoOffer }> | null;
    AccessoryStoreRemainingDurationInSeconds: number;
  };
  BonusStore?: {
    BonusStoreOffers: Array<{ BonusOfferID: string; Offer: DtoOffer; DiscountPercent: number; DiscountCosts: Record<string, number> }>;
    BonusStoreRemainingDurationInSeconds: number;
  };
}

export interface DtoOffers {
  Offers: DtoOffer[] | null;
}

export type CatalogIndex = Map<string, CatalogItem>;

/** The first known currency in a cost map (offers are priced in exactly one). */
function priceOf(cost: Record<string, number> | null | undefined): ItemPrice | undefined {
  if (!cost) return undefined;
  for (const [id, currency] of CURRENCIES) {
    const amount = cost[id];
    if (typeof amount === "number") return { cost: Math.max(0, Math.round(amount)), currency };
  }
  return undefined;
}

/** The item an offer grants: its reward when listed, else the offer id (skin offers are keyed by level). */
const itemIdOf = (o: DtoOffer): string => o.Rewards?.[0]?.ItemID ?? o.OfferID;

function dress(id: string, price: ItemPrice, catalog: CatalogIndex): StoreOffer {
  const item = catalog.get(id);
  return {
    id,
    ...price,
    ...(item ? { kind: item.kind, name: item.name } : {}),
    ...(item?.imageUrl ? { imageUrl: item.imageUrl } : {}),
    ...(item?.cosmeticId ? { cosmeticId: item.cosmeticId } : {}),
  };
}

function toBundle(b: DtoBundle, catalog: CatalogIndex, at: (s: number) => string): StoreBundle {
  const items = (b.Items ?? []).map((i) => {
    const base = Math.max(0, Math.round(i.BasePrice));
    const discounted = i.DiscountedPrice ?? base;
    const currency = CURRENCIES.find(([id]) => id === i.CurrencyID)?.[1] ?? "VP";
    const offer = dress(i.Item.ItemID, { cost: Math.max(0, Math.round(discounted)), currency }, catalog);
    if (discounted < base) {
      offer.originalCost = base;
      if (i.DiscountPercent) offer.discountPercent = Math.round(i.DiscountPercent * (i.DiscountPercent <= 1 ? 100 : 1));
    }
    return offer;
  });
  const total = priceOf(b.TotalDiscountedCost) ?? priceOf(b.TotalBaseCost) ?? { cost: items.reduce((s, i) => s + i.cost, 0), currency: "VP" as const };
  const base = priceOf(b.TotalBaseCost);
  const art = catalog.get(b.DataAssetID);
  const bundle: StoreBundle = {
    id: b.ID,
    ...total,
    endsAt: at(b.DurationRemainingInSeconds),
    items,
    ...(art ? { name: art.name, cosmeticId: b.DataAssetID } : {}),
    ...(art?.imageUrl ? { imageUrl: art.imageUrl } : {}),
  };
  if (base && base.cost > total.cost) {
    bundle.originalCost = base.cost;
    bundle.discountPercent = Math.round((1 - total.cost / base.cost) * 100);
  }
  return bundle;
}

export function toPersonalStore(dto: DtoStorefront, catalog: CatalogIndex, now: number): PersonalStore {
  const at = (seconds: number) => new Date(now + seconds * 1000).toISOString();
  const featured = dto.FeaturedBundle?.Bundles ?? (dto.FeaturedBundle?.Bundle ? [dto.FeaturedBundle.Bundle] : []);
  const store: PersonalStore = {
    daily: dto.SkinsPanelLayout.SingleItemStoreOffers.map((o) => dress(itemIdOf(o), priceOf(o.Cost) ?? { cost: 0, currency: "VP" }, catalog)),
    dailyRefreshAt: at(dto.SkinsPanelLayout.SingleItemOffersRemainingDurationInSeconds),
    bundles: featured.map((b) => toBundle(b, catalog, at)),
  };
  const accessories = dto.AccessoryStore?.AccessoryStoreOffers ?? [];
  if (dto.AccessoryStore && accessories.length > 0) {
    store.accessories = {
      offers: accessories.map(({ Offer }) => dress(itemIdOf(Offer), priceOf(Offer.Cost) ?? { cost: 0, currency: "KC" }, catalog)),
      refreshAt: at(dto.AccessoryStore.AccessoryStoreRemainingDurationInSeconds),
    };
  }
  if (dto.BonusStore && dto.BonusStore.BonusStoreOffers.length > 0) {
    store.nightMarket = {
      offers: dto.BonusStore.BonusStoreOffers.map((b) => {
        const original = priceOf(b.Offer.Cost);
        const offer = dress(itemIdOf(b.Offer), priceOf(b.DiscountCosts) ?? original ?? { cost: 0, currency: "VP" }, catalog);
        if (original) offer.originalCost = original.cost;
        offer.discountPercent = b.DiscountPercent;
        return offer;
      }),
      endsAt: at(dto.BonusStore.BonusStoreRemainingDurationInSeconds),
    };
  }
  return store;
}

/** Every priced item in the catalogue offers, keyed by the item each offer grants. */
export function toPriceList(dto: DtoOffers): PriceList {
  const prices: PriceList = {};
  for (const offer of dto.Offers ?? []) {
    const price = priceOf(offer.Cost);
    if (!price) continue;
    const ids = offer.Rewards?.length ? offer.Rewards.map((r) => r.ItemID) : [offer.OfferID];
    for (const id of ids) prices[id] ??= price;
  }
  return prices;
}
