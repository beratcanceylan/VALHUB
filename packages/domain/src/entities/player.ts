
export type RiotRegion = "ap" | "br" | "eu" | "kr" | "latam" | "na";

export const RIOT_REGIONS: readonly RiotRegion[] = ["ap", "br", "eu", "kr", "latam", "na"];

export interface CompetitiveRank {
  tierId: number;
  name: string;
  rr?: number;
  actId?: string;
}

export interface PlayerProfile {
  puuid: string;
  gameName: string;
  tagLine: string;
  region: RiotRegion;
  rank?: CompetitiveRank;
  peakRank?: CompetitiveRank;
}

export interface MatchSummary {
  id: string;
  startedAt: string;
  mapId: string;
  queue: string;
  agentId?: string;
  won?: boolean;
  roundsWon: number;
  roundsLost: number;
  kills?: number;
  deaths?: number;
  assists?: number;
  score?: number;
}

export interface MatchPlayer {
  puuid: string;
  gameName: string;
  tagLine: string;
  teamId: string;
  agentId: string;
  kills: number;
  deaths: number;
  assists: number;
  score: number;
  roundsPlayed: number;
  headshots?: number;
  bodyshots?: number;
  legshots?: number;
  damageDealt?: number;
  competitiveTier?: number;
}

export interface MatchRound {
  number: number;
  winningTeam: string;
  result: string;
  plantedBy?: string;
  defusedBy?: string;
  plantSite?: string;
}

export interface MatchDetail extends MatchSummary {
  lengthMs?: number;
  teams: Array<{ teamId: string; won: boolean; roundsWon: number }>;
  players: MatchPlayer[];
  rounds: MatchRound[];
}

export interface LeaderboardEntry {
  rank: number;
  gameName?: string;
  tagLine?: string;
  rankedRating: number;
  wins: number;
  competitiveTier?: number;
}

export interface Leaderboard {
  actId: string;
  region: RiotRegion;
  totalPlayers: number;
  entries: LeaderboardEntry[];
}

export interface PlatformIncident {
  id: string;
  title: string;
  severity: string;
  createdAt: string;
  updatedAt?: string;
  message?: string;
}

export interface PlatformStatus {
  region: RiotRegion;
  maintenances: PlatformIncident[];
  incidents: PlatformIncident[];
}

export interface Act {
  id: string;
  name: string;
  isActive: boolean;
  parentId?: string;
  type: "act" | "episode";
}
