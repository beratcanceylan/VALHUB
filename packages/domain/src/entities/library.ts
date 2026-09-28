import type { CrosshairSettings } from "../tools/crosshair";

/** Coordinates normalized to the map's minimap image, 0..1 on each axis. */
export interface NormalizedMapPoint {
  x: number;
  y: number;
  label?: string;
}

export type StrategySide = "ATTACK" | "DEFENSE" | "BOTH";

export interface CrosshairSummary {
  id: string;
  name: string;
  code: string;
  tags: string[];
}

export interface Crosshair extends CrosshairSummary {
  normalized: CrosshairSettings;
  attribution?: string;
}

export type StrategyElement =
  | { kind: "AGENT"; id: string; agentId: string; x: number; y: number; team: "ALLY" | "ENEMY" }
  | { kind: "ABILITY"; id: string; agentId: string; abilityId: string; x: number; y: number }
  | { kind: "ARROW"; id: string; from: NormalizedMapPoint; to: NormalizedMapPoint; color: StrategyColor }
  | { kind: "PATH"; id: string; points: NormalizedMapPoint[]; color: StrategyColor }
  | { kind: "AREA"; id: string; points: NormalizedMapPoint[]; color: StrategyColor }
  | { kind: "LABEL"; id: string; x: number; y: number; text: string };

export type StrategyColor = "ACCENT" | "ALLY" | "ENEMY" | "NEUTRAL";

export interface StrategyFrame {
  id: string;
  title?: string;
  elements: StrategyElement[];
}

export interface Strategy {
  id: string;
  mapId: string;
  title: string;
  side?: StrategySide;
  version: number;
  frames: StrategyFrame[];
  updatedAt: string;
}

export type FavoriteEntityType =
  | "CROSSHAIR"
  | "COSMETIC"
  | "AGENT"
  | "MAP";

export interface Favorite {
  id: string;
  entityType: FavoriteEntityType;
  entityId: string;
  /** Denormalized display label so Library renders without a network round-trip. */
  label?: string;
  createdAt: string;
}

export interface TrainingSession {
  id: string;
  kind: "REACTION";
  startedAt: string;
  attempts: number[];
  bestMs: number;
  averageMs: number;
}

