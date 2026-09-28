import type { AgentSummary, CosmeticSummary, MapSummary, WeaponSummary } from "./entities/content";
import type { CrosshairSummary } from "./entities/library";

export type SearchResult =
  | { kind: "agent"; item: AgentSummary }
  | { kind: "map"; item: MapSummary }
  | { kind: "weapon"; item: WeaponSummary }
  | { kind: "cosmetic"; item: CosmeticSummary }
  | { kind: "crosshair"; item: CrosshairSummary };

export type SearchKind = SearchResult["kind"];

export const SEARCH_KINDS: readonly SearchKind[] = [
  "agent",
  "map",
  "weapon",
  "cosmetic",
  "crosshair",
];

export interface SearchGroup {
  kind: SearchKind;
  results: SearchResult[];
}

export interface SearchResponse {
  query: string;
  groups: SearchGroup[];
  /** Providers that failed; the remaining groups are still valid. */
  degraded: string[];
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function tokenize(value: string): string[] {
  return normalizeSearchText(value).split(" ").filter(Boolean);
}

/**
 * Scores `text` against query tokens. A token matches when it prefixes any word.
 * Returns 0 when no token matches; higher is better.
 */
export function scoreText(text: string, queryTokens: readonly string[]): number {
  if (queryTokens.length === 0) return 0;
  const words = tokenize(text);
  let score = 0;
  for (const token of queryTokens) {
    let best = 0;
    for (const word of words) {
      if (word === token) best = Math.max(best, 3);
      else if (word.startsWith(token)) best = Math.max(best, 2);
      else if (token.length >= 3 && word.includes(token)) best = Math.max(best, 1);
    }
    score += best;
  }
  return score;
}
