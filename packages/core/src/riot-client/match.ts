import type { MatchDetail, MatchSummary } from "@valhub/domain";

// ---- Riot match DTO (shared by the official and client APIs; kept private to riot-client) ----

export interface DtoMatch {
  matchInfo: {
    matchId: string;
    mapId: string;
    gameLengthMillis: number | null;
    gameStartMillis: number;
    /** Official API spelling. */
    queueId?: string;
    /** Client (pd) API spelling. */
    queueID?: string;
    isCompleted: boolean;
  };
  players: Array<{
    /** Client (pd) API spelling of the player id. */
    subject?: string;
    /** Official API spelling. */
    puuid?: string;
    gameName: string;
    tagLine: string;
    teamId: string;
    characterId: string | null;
    competitiveTier?: number;
    stats: { score: number; roundsPlayed: number; kills: number; deaths: number; assists: number } | null;
  }>;
  teams: Array<{ teamId: string; won: boolean; roundsPlayed: number; roundsWon: number }> | null;
  roundResults: Array<{
    roundNum: number;
    roundResult: string;
    winningTeam: string;
    bombPlanter?: string | null;
    bombDefuser?: string | null;
    plantSite?: string | null;
    playerStats: Array<{
      subject?: string;
      puuid?: string;
      damage: Array<{ receiver: string; damage: number; legshots: number; bodyshots: number; headshots: number }> | null;
    }> | null;
  }> | null;
}

/** The pd API names the player id `subject`; the official API names it `puuid`. */
const playerId = (p: { subject?: string; puuid?: string }): string => p.subject ?? p.puuid ?? "";

/** Riot omits or nulls counters in some modes; the contract needs finite numbers. */
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** Maps a raw match DTO to the domain; `mapId` is the already-resolved map id. */
export function toMatchDetail(dto: DtoMatch, mapId: string): MatchDetail {
  const damageBy = new Map<string, { damage: number; head: number; body: number; leg: number }>();
  for (const round of dto.roundResults ?? []) {
    for (const ps of round.playerStats ?? []) {
      const id = playerId(ps);
      const acc = damageBy.get(id) ?? { damage: 0, head: 0, body: 0, leg: 0 };
      for (const d of ps.damage ?? []) {
        acc.damage += num(d.damage);
        acc.head += num(d.headshots);
        acc.body += num(d.bodyshots);
        acc.leg += num(d.legshots);
      }
      damageBy.set(id, acc);
    }
  }
  const hasRounds = (dto.roundResults ?? []).length > 0;
  return {
    id: dto.matchInfo.matchId,
    startedAt: new Date(dto.matchInfo.gameStartMillis).toISOString(),
    mapId,
    queue: dto.matchInfo.queueId || dto.matchInfo.queueID || "custom",
    roundsWon: 0,
    roundsLost: 0,
    ...(dto.matchInfo.gameLengthMillis ? { lengthMs: dto.matchInfo.gameLengthMillis } : {}),
    teams: (dto.teams ?? []).map((t) => ({ teamId: str(t.teamId), won: t.won === true, roundsWon: num(t.roundsWon) })),
    players: dto.players.flatMap((p) => {
      const id = playerId(p);
      if (!p.stats || !p.characterId || !id) return [];
      const dmg = damageBy.get(id);
      return [
        {
          puuid: id,
          gameName: str(p.gameName),
          tagLine: str(p.tagLine),
          teamId: str(p.teamId),
          agentId: p.characterId.toLowerCase(),
          kills: num(p.stats.kills),
          deaths: num(p.stats.deaths),
          assists: num(p.stats.assists),
          score: num(p.stats.score),
          roundsPlayed: num(p.stats.roundsPlayed),
          ...(hasRounds && dmg ? { headshots: dmg.head, bodyshots: dmg.body, legshots: dmg.leg, damageDealt: dmg.damage } : {}),
          ...(typeof p.competitiveTier === "number" ? { competitiveTier: p.competitiveTier } : {}),
        },
      ];
    }),
    rounds: (dto.roundResults ?? []).map((r) => ({
      number: num(r.roundNum) + 1,
      winningTeam: str(r.winningTeam),
      result: str(r.roundResult),
      ...(r.bombPlanter ? { plantedBy: r.bombPlanter } : {}),
      ...(r.bombDefuser ? { defusedBy: r.bombDefuser } : {}),
      ...(r.plantSite ? { plantSite: r.plantSite } : {}),
    })),
  };
}

/** A match seen from one player's side: their team's score, result and line. */
export function summarizeFor(detail: MatchDetail, puuid: string): MatchSummary {
  const me = detail.players.find((p) => p.puuid === puuid);
  const myTeam = detail.teams.find((t) => t.teamId === me?.teamId);
  const other = detail.teams.find((t) => t.teamId !== me?.teamId);
  const summary: MatchSummary = {
    id: detail.id,
    startedAt: detail.startedAt,
    mapId: detail.mapId,
    queue: detail.queue,
    roundsWon: myTeam?.roundsWon ?? 0,
    roundsLost: other?.roundsWon ?? 0,
  };
  if (me) {
    summary.agentId = me.agentId;
    summary.kills = me.kills;
    summary.deaths = me.deaths;
    summary.assists = me.assists;
    summary.score = me.score;
  }
  if (myTeam) summary.won = myTeam.won;
  return summary;
}
