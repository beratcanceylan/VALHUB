import * as SQLite from "expo-sqlite";

/**
 * Local persistence: user-owned state (favorites, preferences, crosshairs, strategies,
 * training, recent searches) plus a BOUNDED normalized query cache. This database must
 * never hold a game-content dump — the cache table is evicted by size and age.
 */
const DB_NAME = "valhub.db";
export const QUERY_CACHE_MAX_ROWS = 400;
export const QUERY_CACHE_MAX_BYTES = 4 * 1024 * 1024;
const QUERY_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const MIGRATIONS = [
  `
  CREATE TABLE IF NOT EXISTS preferences (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS favorites (
    id TEXT PRIMARY KEY NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    label TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(entity_type, entity_id)
  );
  CREATE TABLE IF NOT EXISTS recent_searches (query TEXT PRIMARY KEY NOT NULL, searched_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS query_cache (
    key TEXT PRIMARY KEY NOT NULL,
    body TEXT NOT NULL,
    bytes INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS crosshairs (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    tags TEXT NOT NULL,
    attribution TEXT,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS strategies (
    id TEXT PRIMARY KEY NOT NULL,
    map_id TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    version INTEGER NOT NULL,
    dirty INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS training_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    kind TEXT NOT NULL,
    started_at TEXT NOT NULL,
    attempts TEXT NOT NULL,
    best_ms INTEGER NOT NULL,
    average_ms INTEGER NOT NULL
  );
  `,
];

let instance: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (instance) return instance;
  const db = SQLite.openDatabaseSync(DB_NAME);
  db.execSync("PRAGMA journal_mode = WAL;");
  const row = db.getFirstSync<{ user_version: number }>("PRAGMA user_version");
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    db.execSync(MIGRATIONS[version]!);
    version += 1;
    db.execSync(`PRAGMA user_version = ${version}`);
  }
  instance = db;
  return db;
}

// ---------- preferences ----------

export function getPreference<T>(key: string, fallback: T): T {
  const row = getDb().getFirstSync<{ value: string }>("SELECT value FROM preferences WHERE key = ?", key);
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

export function setPreference(key: string, value: unknown): void {
  getDb().runSync("INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)", key, JSON.stringify(value));
}

// ---------- bounded query cache ----------

export function readQueryCache<T>(key: string): { data: T; updatedAt: number } | undefined {
  const row = getDb().getFirstSync<{ body: string; updated_at: number }>("SELECT body, updated_at FROM query_cache WHERE key = ?", key);
  if (!row) return undefined;
  if (Date.now() - row.updated_at > QUERY_CACHE_MAX_AGE_MS) return undefined;
  try {
    return { data: JSON.parse(row.body) as T, updatedAt: row.updated_at };
  } catch {
    return undefined;
  }
}

export function writeQueryCache(key: string, data: unknown): void {
  const body = JSON.stringify(data);
  // Single entries larger than 256 KB are not worth persisting (and hint at a misuse).
  if (body.length > 256 * 1024) return;
  const db = getDb();
  db.runSync("INSERT OR REPLACE INTO query_cache (key, body, bytes, updated_at) VALUES (?, ?, ?, ?)", key, body, body.length, Date.now());
}

/** Enforces age, row-count and byte limits. Returns number of evicted rows. */
export function evictQueryCache(now: number = Date.now()): number {
  const db = getDb();
  let evicted = db.runSync("DELETE FROM query_cache WHERE updated_at < ?", now - QUERY_CACHE_MAX_AGE_MS).changes;
  const stats = db.getFirstSync<{ n: number; bytes: number | null }>("SELECT COUNT(*) AS n, SUM(bytes) AS bytes FROM query_cache");
  let rows = stats?.n ?? 0;
  let bytes = stats?.bytes ?? 0;
  if (rows <= QUERY_CACHE_MAX_ROWS && bytes <= QUERY_CACHE_MAX_BYTES) return evicted;
  const oldest = db.getAllSync<{ key: string; bytes: number }>("SELECT key, bytes FROM query_cache ORDER BY updated_at ASC");
  for (const entry of oldest) {
    if (rows <= QUERY_CACHE_MAX_ROWS && bytes <= QUERY_CACHE_MAX_BYTES) break;
    db.runSync("DELETE FROM query_cache WHERE key = ?", entry.key);
    rows -= 1;
    bytes -= entry.bytes;
    evicted += 1;
  }
  return evicted;
}

export function queryCacheStats(): { rows: number; bytes: number } {
  const stats = getDb().getFirstSync<{ n: number; bytes: number | null }>("SELECT COUNT(*) AS n, SUM(bytes) AS bytes FROM query_cache");
  return { rows: stats?.n ?? 0, bytes: stats?.bytes ?? 0 };
}

export function clearQueryCache(): void {
  getDb().runSync("DELETE FROM query_cache");
}
