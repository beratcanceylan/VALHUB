import { useEffect, useMemo } from "react";
import { QueryClient, useInfiniteQuery, useQuery, type QueryKey, type UseQueryOptions } from "@tanstack/react-query";
import { buildBootstrap, getAgentMedia, getPlatformStatus } from "@valhub/core";
import { AppError, type CosmeticKind, type RiotRegion, type SearchKind } from "@valhub/domain";
import { useLocale } from "@/i18n";
import { readQueryCache, writeQueryCache } from "./cache/db";
import { core } from "./core";
import { useSession } from "@/auth/session";
import { call } from "./client";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // No retry storms: never retry auth/permission/rate-limit/validation failures.
        retry: (failureCount, error) => {
          if (error instanceof AppError && !error.retryable) return false;
          return failureCount < 2;
        },
        retryDelay: (attempt, error) => {
          if (error instanceof AppError && error.retryAfter !== undefined) return error.retryAfter * 1000;
          return Math.min(8000, 500 * 2 ** attempt);
        },
        refetchOnWindowFocus: false,
      },
    },
  });
}

/** Query key factories, one namespace per domain. */
const qk = {
  bootstrap: (locale: string, signedIn: boolean) => ["bootstrap", locale, signedIn] as const,
  agents: (locale: string) => ["content", "agents", locale] as const,
  agent: (id: string, locale: string) => ["content", "agent", id, locale] as const,
  agentMedia: (id: string, locale: string) => ["content", "agentMedia", id, locale] as const,
  maps: (locale: string) => ["content", "maps", locale] as const,
  map: (id: string, locale: string) => ["content", "map", id, locale] as const,
  weapons: (locale: string) => ["content", "weapons", locale] as const,
  weapon: (id: string, locale: string) => ["content", "weapon", id, locale] as const,
  cosmetics: (params: object, locale: string) => ["content", "cosmetics", params, locale] as const,
  cosmetic: (id: string, locale: string) => ["content", "cosmetic", id, locale] as const,
  wiki: (title: string, locale: string) => ["wiki", title, locale] as const,
  news: (category: string, locale: string) => ["news", category, locale] as const,
  crosshairPresets: () => ["crosshairPresets"] as const,
  search: (q: string, locale: string, kinds?: string) => ["search", q, locale, kinds ?? "all"] as const,
  me: () => ["player", "me"] as const,
  myMatches: () => ["player", "matches"] as const,
  match: (id: string) => ["player", "match", id] as const,
  leaderboard: (region: string, actId?: string) => ["leaderboard", region, actId ?? "current"] as const,
  acts: (locale: string) => ["acts", locale] as const,
  status: (region: string) => ["status", region] as const,
  store: () => ["player", "store"] as const,
  prices: () => ["player", "prices"] as const,
  currencyIcons: () => ["content", "currencyIcons"] as const,
};

type Options<T> = Omit<UseQueryOptions<T, AppError, T, QueryKey>, "queryKey" | "queryFn">;

/**
 * useQuery + bounded SQLite persistence: the last good response seeds the query as
 * *stale* initial data (so the UI can show it with a stale notice while refetching) and
 * successful responses are written back. Only small normalized payloads use this.
 */
function usePersistedQuery<T>(key: QueryKey, fetcher: () => Promise<T>, options: Options<T> & { persist?: boolean } = {}) {
  const { persist = true, ...rest } = options;
  const cacheKey = useMemo(() => JSON.stringify(key), [key]);
  const seed = useMemo(() => (persist ? readQueryCache<T>(cacheKey) : undefined), [cacheKey, persist]);
  const query = useQuery<T, AppError, T, QueryKey>({
    queryKey: key,
    queryFn: () => fetcher(),
    ...(seed ? { initialData: seed.data, initialDataUpdatedAt: seed.updatedAt } : {}),
    ...rest,
  });
  useEffect(() => {
    if (persist && query.isSuccess && query.dataUpdatedAt !== seed?.updatedAt && query.data !== undefined) {
      writeQueryCache(cacheKey, query.data);
    }
  }, [persist, cacheKey, query.isSuccess, query.data, query.dataUpdatedAt, seed?.updatedAt]);
  return query;
}

// ---------- content (on-device via @valhub/core) ----------

/** Built locally: capabilities and attribution never need the network. */
export function useBootstrap(signedIn: boolean) {
  const locale = useLocale();
  return useQuery<Awaited<ReturnType<typeof call<"bootstrap">>>, AppError>({
    queryKey: qk.bootstrap(locale, signedIn),
    queryFn: () => call("bootstrap", () => buildBootstrap({ locale, signedIn })),
    staleTime: Infinity,
  });
}

export function useAgents() {
  const locale = useLocale();
  return usePersistedQuery(qk.agents(locale), () => call("agents", () => core.content.getAgents(locale)), { staleTime: 6 * HOUR });
}

export function useAgent(id: string) {
  const locale = useLocale();
  return usePersistedQuery(qk.agent(id, locale), () => call("agent", () => core.content.getAgent(id, locale)), { staleTime: 6 * HOUR, enabled: !!id });
}

/** Official ability video URLs. The URL list is persisted; the videos never are. */
export function useAgentMedia(id: string) {
  const locale = useLocale();
  return usePersistedQuery(qk.agentMedia(id, locale), () => call("agentMedia", () => getAgentMedia(core, id, locale)), {
    staleTime: 6 * HOUR,
  });
}

export function useMaps() {
  const locale = useLocale();
  return usePersistedQuery(qk.maps(locale), () => call("maps", () => core.content.getMaps(locale)), { staleTime: 6 * HOUR });
}

export function useMap(id: string) {
  const locale = useLocale();
  return usePersistedQuery(qk.map(id, locale), () => call("map", () => core.content.getMap(id, locale)), { staleTime: 6 * HOUR, enabled: !!id });
}

export function useWeapons() {
  const locale = useLocale();
  return usePersistedQuery(qk.weapons(locale), () => call("weapons", () => core.content.getWeapons(locale)), { staleTime: 6 * HOUR });
}

export function useWeapon(id: string) {
  const locale = useLocale();
  return usePersistedQuery(qk.weapon(id, locale), () => call("weapon", () => core.content.getWeapon(id, locale)), { staleTime: 6 * HOUR });
}

export function useCurrencyIcons() {
  return usePersistedQuery(qk.currencyIcons(), () => call("currencyIcons", () => core.content.getCurrencyIcons()), { staleTime: 24 * HOUR });
}

export function useCosmetics(params: { kind?: CosmeticKind; q?: string; weaponId?: string }) {
  const locale = useLocale();
  return useInfiniteQuery({
    queryKey: qk.cosmetics(params, locale),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      call("cosmetics", () =>
        core.content.getCosmetics(
          {
            ...(params.kind ? { kind: params.kind } : {}),
            ...(params.weaponId ? { weaponId: params.weaponId } : {}),
            ...(params.q ? { q: params.q.slice(0, 80) } : {}),
            ...(pageParam ? { cursor: pageParam } : {}),
            limit: 40,
          },
          locale,
        ),
      ),
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 6 * HOUR,
  });
}

export function useCosmetic(id: string) {
  const locale = useLocale();
  return usePersistedQuery(qk.cosmetic(id, locale), () => call("cosmetic", () => core.content.getCosmetic(id, locale)), {
    staleTime: 6 * HOUR,
  });
}

export function useWiki(title: string | undefined) {
  const locale = useLocale();
  return usePersistedQuery(qk.wiki(title ?? "", locale), () => call("wiki", () => core.wiki.getExcerpt(title ?? "", locale)), {
    staleTime: HOUR,
    enabled: !!title,
  });
}

export function useNews(category: "game-updates" | "all" = "game-updates") {
  const locale = useLocale();
  return usePersistedQuery(qk.news(category, locale), () => call("news", () => core.playValorant.getNews(category, locale)), {
    staleTime: 30 * MINUTE,
  });
}

export function useCrosshairPresets() {
  return usePersistedQuery(qk.crosshairPresets(), () => call("crosshairPresets", () => core.crosshairPresets()), {
    staleTime: Infinity,
    persist: false,
  });
}

// ---------- search ----------

export function useSearch(query: string, kinds?: SearchKind[]) {
  const locale = useLocale();
  const k = kinds?.join(",");
  return useQuery<Awaited<ReturnType<typeof call<"search">>>, AppError>({
    queryKey: qk.search(query, locale, k),
    queryFn: () => call("search", () => core.search.search(query.slice(0, 100), locale, kinds?.length ? kinds : undefined)),
    enabled: query.trim().length >= 2,
    staleTime: MINUTE,
    placeholderData: (prev) => prev,
  });
}

// ---------- player (Riot Client session on this device) ----------

export function useMe(enabled: boolean) {
  const locale = useLocale();
  const { requireRiot } = useSession();
  return usePersistedQuery(qk.me(), () => call("me", async () => core.riot.profile(await requireRiot(), locale)), { staleTime: 2 * MINUTE, enabled });
}

export function useMyMatches(enabled: boolean) {
  const { requireRiot } = useSession();
  return useInfiniteQuery({
    queryKey: qk.myMatches(),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => call("myMatches", async () => core.riot.matches(await requireRiot(), pageParam, 10)),
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 90_000,
    enabled,
  });
}

export function useMatch(id: string, enabled: boolean) {
  const { requireRiot } = useSession();
  return usePersistedQuery(qk.match(id), () => call("match", async () => core.riot.match(await requireRiot(), id)), { staleTime: Infinity, enabled });
}

export function useLeaderboard(region: RiotRegion, enabled: boolean) {
  const { requireRiot } = useSession();
  return usePersistedQuery(qk.leaderboard(region), () => call("leaderboard", async () => core.riot.leaderboard(await requireRiot(), 0, 50, region)), {
    staleTime: 3 * MINUTE,
    enabled,
    persist: false,
  });
}

export function usePlatformStatus(region: RiotRegion, enabled: boolean) {
  const locale = useLocale();
  return usePersistedQuery(qk.status(region), () => call("status", () => getPlatformStatus(region, locale, core.cache)), {
    staleTime: 45_000,
    enabled,
    persist: false,
  });
}

export function usePersonalStore(enabled: boolean) {
  const locale = useLocale();
  const { requireRiot } = useSession();
  return usePersistedQuery(qk.store(), () => call("personalStore", async () => core.riot.storefront(await requireRiot(), locale)), {
    staleTime: 5 * MINUTE,
    enabled,
    persist: false,
  });
}

/** Catalogue prices by item id; needs the Riot session, so content screens treat it as optional. */
export function usePrices(enabled: boolean) {
  const { requireRiot } = useSession();
  return usePersistedQuery(qk.prices(), () => call("prices", async () => core.riot.prices(await requireRiot())), {
    staleTime: 6 * HOUR,
    enabled,
    persist: false,
  });
}
