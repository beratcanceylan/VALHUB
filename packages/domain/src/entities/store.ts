import type { CosmeticKind } from "./content";

/** In-game currencies: Valorant Points, Kingdom Credits, Radianite Points. */
export type StoreCurrency = "VP" | "KC" | "RP";

export interface ItemPrice {
  cost: number;
  currency: StoreCurrency;
}

export interface StoreOffer extends ItemPrice {
  /** The item Riot sells (a skin level, buddy level, spray, card, title…). */
  id: string;
  kind?: CosmeticKind;
  /** Catalogue entry to open for details (a skin level resolves to its skin). */
  cosmeticId?: string;
  /** Missing when valorant-api has not indexed a brand-new item yet. */
  name?: string;
  imageUrl?: string;
  /** Discounted offers only. */
  originalCost?: number;
  discountPercent?: number;
}

/** A featured collection currently on sale. */
export interface StoreBundle extends ItemPrice {
  id: string;
  cosmeticId?: string;
  name?: string;
  imageUrl?: string;
  originalCost?: number;
  discountPercent?: number;
  endsAt: string;
  items: StoreOffer[];
}

/** The signed-in player's own store rotation. */
export interface PersonalStore {
  daily: StoreOffer[];
  dailyRefreshAt: string;
  bundles: StoreBundle[];
  accessories?: { offers: StoreOffer[]; refreshAt: string };
  nightMarket?: { offers: StoreOffer[]; endsAt: string };
  walletVp?: number;
  walletKc?: number;
}

/** Currency symbol art by currency. */
export type CurrencyIcons = Partial<Record<StoreCurrency, string>>;

/** Catalogue prices by item id (skin levels, chromas…), from the player's store. */
export type PriceList = Record<string, ItemPrice>;
