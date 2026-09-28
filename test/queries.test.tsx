import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import { AppError } from "@valhub/domain";

const mockCache = new Map<string, { data: unknown; updatedAt: number }>();
jest.mock("@/data/cache/db", () => ({
  getPreference: (_key: string, fallback: unknown) => fallback,
  setPreference: jest.fn(),
  readQueryCache: (key: string) => mockCache.get(key),
  writeQueryCache: (key: string, data: unknown) => mockCache.set(key, { data, updatedAt: 1 }),
}));
jest.mock("@/data/client", () => ({ call: async (_key: string, loader: () => unknown) => loader() }));
jest.mock("@/auth/session", () => ({ useSession: () => ({ requireRiot: async () => ({ puuid: "me" }) }) }));
jest.mock("@valhub/core", () => ({
  ...jest.requireActual("@valhub/core"),
  getPlatformStatus: async (region: string) => ({ region, incidents: [] }),
  getAgentMedia: async (_core: unknown, id: string) => ({ agentId: id, abilities: [] }),
}));
jest.mock("@/data/core", () => {
  const page = (cursor?: string) => ({ items: [cursor ?? "first"], total: 2, ...(cursor ? {} : { nextCursor: "2" }) });
  return {
    core: {
      cache: {},
      content: {
        getAgents: async () => ["jett"],
        getAgent: async (id: string) => ({ id }),
        getMaps: async () => ["ascent"],
        getMap: async (id: string) => ({ id }),
        getWeapons: async () => ["vandal"],
        getWeapon: async (id: string) => ({ id }),
        getCurrencyIcons: async () => ({ VP: "vp.png" }),
        getCosmetics: async (query: { cursor?: string }) => page(query.cursor),
        getCosmetic: async (id: string) => ({ id }),
      },
      wiki: { getExcerpt: async (title: string) => ({ title }) },
      playValorant: { getNews: async (category: string) => [category] },
      crosshairPresets: async () => ["dot"],
      search: { search: async (q: string) => ({ query: q, groups: [] }) },
      riot: {
        profile: async () => ({ name: "me" }),
        matches: async (_s: unknown, cursor?: string) => page(cursor),
        match: async (_s: unknown, id: string) => ({ id }),
        leaderboard: async () => ({ players: [] }),
        storefront: async () => ({ offers: [] }),
        prices: async () => ({ prices: {} }),
      },
    },
  };
});

import { I18nProvider } from "@/i18n";
import * as Q from "@/data/queries";

function wrapper({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <QueryClientProvider client={Q.createQueryClient()}>
      <I18nProvider>{children}</I18nProvider>
    </QueryClientProvider>
  );
}

async function settle<T extends { isSuccess: boolean }>(hook: () => T) {
  const { result } = await renderHook(hook, { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  return result.current;
}

describe("query hooks", () => {
  it("load content through the on-device core and persist it", async () => {
    expect((await settle(() => Q.useAgents())).data).toEqual(["jett"]);
    expect((await settle(() => Q.useAgent("jett"))).data).toEqual({ id: "jett" });
    expect((await settle(() => Q.useAgentMedia("jett"))).data).toMatchObject({ agentId: "jett" });
    expect((await settle(() => Q.useMaps())).data).toEqual(["ascent"]);
    expect((await settle(() => Q.useMap("ascent"))).data).toEqual({ id: "ascent" });
    expect((await settle(() => Q.useWeapons())).data).toEqual(["vandal"]);
    expect((await settle(() => Q.useWeapon("vandal"))).data).toEqual({ id: "vandal" });
    expect((await settle(() => Q.useCurrencyIcons())).data).toEqual({ VP: "vp.png" });
    expect((await settle(() => Q.useCosmetic("skin"))).data).toEqual({ id: "skin" });
    expect((await settle(() => Q.useWiki("Jett"))).data).toEqual({ title: "Jett" });
    expect((await settle(() => Q.useNews())).data).toEqual(["game-updates"]);
    expect((await settle(() => Q.useCrosshairPresets())).data).toEqual(["dot"]);
    expect((await settle(() => Q.useBootstrap(false))).data).toBeDefined();
    expect(mockCache.size).toBeGreaterThan(5);
  });

  it("seeds queries from the persisted cache", async () => {
    mockCache.set(JSON.stringify(["content", "maps", "en"]), { data: ["cached"], updatedAt: 1 });
    const { result } = await renderHook(() => Q.useMaps(), { wrapper });
    expect(result.current.data).toEqual(["cached"]);
  });

  it("pages cosmetics and matches", async () => {
    const cosmetics = await settle(() => Q.useCosmetics({ kind: "SPRAY", q: "abc", weaponId: "w" }));
    expect(cosmetics.data?.pages[0]).toMatchObject({ nextCursor: "2" });
    expect(cosmetics.hasNextPage).toBe(true);
    const matches = await settle(() => Q.useMyMatches(true));
    expect(matches.data?.pages).toHaveLength(1);
  });

  it("load player data with the Riot session", async () => {
    expect((await settle(() => Q.useSearch("jett"))).data).toMatchObject({ query: "jett" });
    expect((await settle(() => Q.useMe(true))).data).toEqual({ name: "me" });
    expect((await settle(() => Q.useMatch("m1", true))).data).toEqual({ id: "m1" });
    expect((await settle(() => Q.useLeaderboard("eu", true))).data).toEqual({ players: [] });
    expect((await settle(() => Q.usePlatformStatus("eu", true))).data).toMatchObject({ region: "eu" });
    expect((await settle(() => Q.usePersonalStore(true))).data).toEqual({ offers: [] });
    expect((await settle(() => Q.usePrices(true))).data).toEqual({ prices: {} });
  });

  it("never retries non-retryable errors and honours Retry-After", () => {
    const client = Q.createQueryClient();
    const { retry, retryDelay } = client.getDefaultOptions().queries as {
      retry: (n: number, e: unknown) => boolean;
      retryDelay: (n: number, e: unknown) => number;
    };
    expect(retry(0, new AppError("UNAUTHORIZED", "no"))).toBe(false);
    expect(retry(1, new Error("net"))).toBe(true);
    expect(retry(2, new Error("net"))).toBe(false);
    const limited = new AppError("RATE_LIMITED", "slow", { retryAfter: 3 });
    expect(retryDelay(0, limited)).toBe(3000);
    expect(retryDelay(10, new Error("net"))).toBe(8000);
  });
});
