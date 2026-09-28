jest.unmock("@/data/cache/db");
jest.mock("expo-sqlite", () => {
  const { DatabaseSync } = jest.requireActual("node:sqlite");
  return {
    openDatabaseSync: () => {
      const db = new DatabaseSync(":memory:");
      return {
        execSync: (sql: string) => db.exec(sql),
        getFirstSync: (sql: string, ...params: unknown[]) => db.prepare(sql).get(...params) ?? null,
        getAllSync: (sql: string, ...params: unknown[]) => db.prepare(sql).all(...params),
        runSync: (sql: string, ...params: unknown[]) => {
          const result = db.prepare(sql).run(...params);
          return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
        },
      };
    },
  };
});
jest.mock("expo-crypto", () => ({ randomUUID: () => jest.requireActual("node:crypto").randomUUID() }));

import type { Strategy } from "@valhub/domain";
import {
  clearQueryCache,
  evictQueryCache,
  getDb,
  getPreference,
  QUERY_CACHE_MAX_ROWS,
  queryCacheStats,
  readQueryCache,
  setPreference,
  writeQueryCache,
} from "@/data/cache/db";
import { favorites, recentSearches, savedCrosshairs, strategies, training } from "@/data/repositories/library";

describe("local database", () => {
  it("migrates once and stores JSON preferences", () => {
    expect(getDb()).toBe(getDb());
    expect(getPreference("theme", "system")).toBe("system");
    setPreference("theme", { mode: "dark" });
    expect(getPreference("theme", null)).toEqual({ mode: "dark" });
    getDb().runSync("INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)", "broken", "{");
    expect(getPreference("broken", 1)).toBe(1);
  });

  it("keeps the query cache bounded by age, size and row count", () => {
    clearQueryCache();
    writeQueryCache("a", { n: 1 });
    expect(readQueryCache<{ n: number }>("a")?.data).toEqual({ n: 1 });
    expect(readQueryCache("missing")).toBeUndefined();
    writeQueryCache("huge", "x".repeat(300 * 1024));
    expect(readQueryCache("huge")).toBeUndefined();
    getDb().runSync("UPDATE query_cache SET updated_at = 0 WHERE key = 'a'");
    expect(readQueryCache("a")).toBeUndefined();
    expect(evictQueryCache()).toBe(1);

    for (let i = 0; i < QUERY_CACHE_MAX_ROWS + 5; i++) writeQueryCache(`k${i}`, i);
    expect(evictQueryCache()).toBe(5);
    expect(queryCacheStats().rows).toBe(QUERY_CACHE_MAX_ROWS);
    getDb().runSync("INSERT OR REPLACE INTO query_cache (key, body, bytes, updated_at) VALUES ('bad', '{', 1, ?)", Date.now());
    expect(readQueryCache("bad")).toBeUndefined();
    clearQueryCache();
    expect(queryCacheStats()).toEqual({ rows: 0, bytes: 0 });
  });
});

describe("library repositories", () => {
  it("adds, lists and removes favorites", () => {
    favorites.add("AGENT", "jett", "Jett");
    favorites.add("AGENT", "jett", "Jett");
    favorites.add("MAP", "ascent");
    expect(favorites.has("AGENT", "jett")).toBe(true);
    expect(favorites.list("AGENT")).toEqual([expect.objectContaining({ entityId: "jett", label: "Jett" })]);
    expect(favorites.list()).toHaveLength(2);
    favorites.remove("AGENT", "jett");
    expect(favorites.has("AGENT", "jett")).toBe(false);
  });

  it("saves crosshairs with tags and attribution", () => {
    const id = savedCrosshairs.save({ name: "Dot", code: "0;P;c;1", tags: ["dot"], attribution: "pro" });
    savedCrosshairs.save({ name: "Plain", code: "0" });
    expect(savedCrosshairs.get(id)).toMatchObject({ name: "Dot", tags: ["dot"], attribution: "pro" });
    expect(savedCrosshairs.list()).toHaveLength(2);
    savedCrosshairs.remove(id);
    expect(savedCrosshairs.get(id)).toBeUndefined();
  });

  it("tracks strategy sync state", () => {
    const strategy = { id: "s1", mapId: "ascent", title: "A split", version: 1, updatedAt: "2026-09-28T00:00:00Z" } as Strategy;
    strategies.save(strategy);
    expect(strategies.get("s1")).toEqual(strategy);
    expect(strategies.dirty()).toHaveLength(1);
    strategies.markSynced("s1", 2);
    expect(strategies.dirty()).toHaveLength(0);
    expect(strategies.list()).toHaveLength(1);
    strategies.remove("s1");
    expect(strategies.get("s1")).toBeUndefined();
  });

  it("keeps training history and recent searches bounded", () => {
    for (let i = 0; i < 3; i++) {
      training.add({ kind: "REACTION", startedAt: `2026-09-2${i}T00:00:00Z`, attempts: [200, 250], bestMs: 200, averageMs: 225 });
    }
    expect(training.list(2).map((s) => s.startedAt)).toEqual(["2026-09-22T00:00:00Z", "2026-09-21T00:00:00Z"]);

    recentSearches.add(" j ");
    for (let i = 0; i < 25; i++) recentSearches.add(`query ${i}`);
    expect(recentSearches.list()).toHaveLength(10);
    recentSearches.clear();
    expect(recentSearches.list()).toEqual([]);
  });
});
