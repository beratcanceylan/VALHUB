import type { MatchDetail, MatchSummary } from "./entities/player";

/**
 * Derived metrics computed ONLY from fields present in official match payloads.
 * No alternative MMR/ELO or hidden-rating estimation lives here — that is prohibited by
 * Riot policy.
 */

export function kdRatio(kills: number, deaths: number): number {
  return deaths === 0 ? kills : kills / deaths;
}

export function headshotPercent(headshots: number, bodyshots: number, legshots: number): number | undefined {
  const total = headshots + bodyshots + legshots;
  return total === 0 ? undefined : (headshots / total) * 100;
}

export function averageCombatScore(score: number, roundsPlayed: number): number | undefined {
  return roundsPlayed === 0 ? undefined : score / roundsPlayed;
}

export function damagePerRound(damage: number, roundsPlayed: number): number | undefined {
  return roundsPlayed === 0 ? undefined : damage / roundsPlayed;
}

export interface GroupPerformance {
  key: string;
  matches: number;
  wins: number;
  winRate: number;
  kills: number;
  deaths: number;
  assists: number;
  kd: number;
}

/** Below this many matches a group is flagged as an insufficient sample in the UI. */
export const MIN_SAMPLE_MATCHES = 5;

export function groupPerformance(
  matches: readonly MatchSummary[],
  keyOf: (match: MatchSummary) => string | undefined,
): GroupPerformance[] {
  const groups = new Map<string, GroupPerformance>();
  for (const match of matches) {
    const key = keyOf(match);
    if (!key) continue;
    const g = groups.get(key) ?? { key, matches: 0, wins: 0, winRate: 0, kills: 0, deaths: 0, assists: 0, kd: 0 };
    g.matches += 1;
    if (match.won) g.wins += 1;
    g.kills += match.kills ?? 0;
    g.deaths += match.deaths ?? 0;
    g.assists += match.assists ?? 0;
    groups.set(key, g);
  }
  return [...groups.values()]
    .map((g) => ({ ...g, winRate: g.matches === 0 ? 0 : g.wins / g.matches, kd: kdRatio(g.kills, g.deaths) }))
    .sort((a, b) => b.matches - a.matches);
}

/** Summarizes the requesting player's line in a match detail. */
export function playerLine(detail: MatchDetail, puuid: string) {
  const p = detail.players.find((player) => player.puuid === puuid);
  if (!p) return undefined;
  return {
    player: p,
    kd: kdRatio(p.kills, p.deaths),
    acs: averageCombatScore(p.score, p.roundsPlayed),
    hsPercent:
      p.headshots !== undefined && p.bodyshots !== undefined && p.legshots !== undefined
        ? headshotPercent(p.headshots, p.bodyshots, p.legshots)
        : undefined,
    adr: p.damageDealt !== undefined ? damagePerRound(p.damageDealt, p.roundsPlayed) : undefined,
  };
}
