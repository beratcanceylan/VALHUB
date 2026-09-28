import type { Favorite, FavoriteEntityType, Strategy, TrainingSession } from "@valhub/domain";
import { getDb } from "../cache/db";
import { newId } from "@/lib/id";

/** Local-first user library. All reads are synchronous and small (bounded by user actions). */

export const favorites = {
  list(type?: FavoriteEntityType): Favorite[] {
    const rows = type
      ? getDb().getAllSync<Row>("SELECT * FROM favorites WHERE entity_type = ? ORDER BY created_at DESC", type)
      : getDb().getAllSync<Row>("SELECT * FROM favorites ORDER BY created_at DESC");
    return rows.map(toFavorite);
  },
  has(type: FavoriteEntityType, entityId: string): boolean {
    return !!getDb().getFirstSync("SELECT 1 FROM favorites WHERE entity_type = ? AND entity_id = ?", type, entityId);
  },
  add(type: FavoriteEntityType, entityId: string, label?: string): void {
    getDb().runSync(
      "INSERT OR IGNORE INTO favorites (id, entity_type, entity_id, label, created_at) VALUES (?, ?, ?, ?, ?)",
      newId(),
      type,
      entityId,
      label ?? null,
      new Date().toISOString(),
    );
  },
  remove(type: FavoriteEntityType, entityId: string): void {
    getDb().runSync("DELETE FROM favorites WHERE entity_type = ? AND entity_id = ?", type, entityId);
  },
};

type Row = { id: string; entity_type: string; entity_id: string; label: string | null; created_at: string };

function toFavorite(r: Row): Favorite {
  const f: Favorite = { id: r.id, entityType: r.entity_type as FavoriteEntityType, entityId: r.entity_id, createdAt: r.created_at };
  if (r.label) f.label = r.label;
  return f;
}

export interface SavedCrosshair {
  id: string;
  name: string;
  code: string;
  tags: string[];
  attribution?: string;
  updatedAt: string;
}

export const savedCrosshairs = {
  list(): SavedCrosshair[] {
    return getDb()
      .getAllSync<{ id: string; name: string; code: string; tags: string; attribution: string | null; updated_at: string }>(
        "SELECT * FROM crosshairs ORDER BY updated_at DESC",
      )
      .map((r) => ({
        id: r.id,
        name: r.name,
        code: r.code,
        tags: JSON.parse(r.tags) as string[],
        updatedAt: r.updated_at,
        ...(r.attribution ? { attribution: r.attribution } : {}),
      }));
  },
  get(id: string): SavedCrosshair | undefined {
    return this.list().find((c) => c.id === id);
  },
  save(input: { id?: string; name: string; code: string; tags?: string[]; attribution?: string }): string {
    const id = input.id ?? newId();
    getDb().runSync(
      "INSERT OR REPLACE INTO crosshairs (id, name, code, tags, attribution, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      id,
      input.name,
      input.code,
      JSON.stringify(input.tags ?? []),
      input.attribution ?? null,
      new Date().toISOString(),
    );
    return id;
  },
  remove(id: string): void {
    getDb().runSync("DELETE FROM crosshairs WHERE id = ?", id);
  },
};

export const strategies = {
  list(): Strategy[] {
    return getDb()
      .getAllSync<{ body: string }>("SELECT body FROM strategies ORDER BY updated_at DESC")
      .map((r) => JSON.parse(r.body) as Strategy);
  },
  get(id: string): Strategy | undefined {
    const row = getDb().getFirstSync<{ body: string }>("SELECT body FROM strategies WHERE id = ?", id);
    return row ? (JSON.parse(row.body) as Strategy) : undefined;
  },
  save(strategy: Strategy): void {
    getDb().runSync(
      "INSERT OR REPLACE INTO strategies (id, map_id, title, body, version, dirty, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?)",
      strategy.id,
      strategy.mapId,
      strategy.title,
      JSON.stringify(strategy),
      strategy.version,
      strategy.updatedAt,
    );
  },
  markSynced(id: string, version: number): void {
    getDb().runSync("UPDATE strategies SET dirty = 0, version = ? WHERE id = ?", version, id);
  },
  dirty(): Strategy[] {
    return getDb()
      .getAllSync<{ body: string }>("SELECT body FROM strategies WHERE dirty = 1")
      .map((r) => JSON.parse(r.body) as Strategy);
  },
  remove(id: string): void {
    getDb().runSync("DELETE FROM strategies WHERE id = ?", id);
  },
};

export const training = {
  list(limit = 20): TrainingSession[] {
    return getDb()
      .getAllSync<{ id: string; kind: string; started_at: string; attempts: string; best_ms: number; average_ms: number }>(
        "SELECT * FROM training_sessions ORDER BY started_at DESC LIMIT ?",
        limit,
      )
      .map((r) => ({
        id: r.id,
        kind: "REACTION" as const,
        startedAt: r.started_at,
        attempts: JSON.parse(r.attempts) as number[],
        bestMs: r.best_ms,
        averageMs: r.average_ms,
      }));
  },
  add(session: Omit<TrainingSession, "id">): void {
    getDb().runSync(
      "INSERT INTO training_sessions (id, kind, started_at, attempts, best_ms, average_ms) VALUES (?, ?, ?, ?, ?, ?)",
      newId(),
      session.kind,
      session.startedAt,
      JSON.stringify(session.attempts),
      session.bestMs,
      session.averageMs,
    );
    // Keep local history bounded.
    getDb().runSync("DELETE FROM training_sessions WHERE id NOT IN (SELECT id FROM training_sessions ORDER BY started_at DESC LIMIT 200)");
  },
};

export const recentSearches = {
  list(): string[] {
    return getDb()
      .getAllSync<{ query: string }>("SELECT query FROM recent_searches ORDER BY searched_at DESC LIMIT 10")
      .map((r) => r.query);
  },
  add(query: string): void {
    const q = query.trim();
    if (q.length < 2) return;
    getDb().runSync("INSERT OR REPLACE INTO recent_searches (query, searched_at) VALUES (?, ?)", q, Date.now());
    getDb().runSync("DELETE FROM recent_searches WHERE query NOT IN (SELECT query FROM recent_searches ORDER BY searched_at DESC LIMIT 20)");
  },
  clear(): void {
    getDb().runSync("DELETE FROM recent_searches");
  },
};
