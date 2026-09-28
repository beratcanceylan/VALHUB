/** Reaction-time drill helpers. Purely local; no network dependency. */

export const REACTION_MIN_DELAY_MS = 1200;
export const REACTION_MAX_DELAY_MS = 4000;
/** Anything faster than this is treated as anticipation, not reaction. */
export const REACTION_ANTICIPATION_MS = 100;

export function randomReactionDelay(random: () => number = Math.random): number {
  return Math.round(REACTION_MIN_DELAY_MS + random() * (REACTION_MAX_DELAY_MS - REACTION_MIN_DELAY_MS));
}

export interface ReactionSummary {
  attempts: number;
  bestMs: number;
  averageMs: number;
  medianMs: number;
}

export function summarizeReactions(samples: readonly number[]): ReactionSummary | undefined {
  const valid = samples.filter((ms) => Number.isFinite(ms) && ms >= REACTION_ANTICIPATION_MS);
  if (valid.length === 0) return undefined;
  const sorted = [...valid].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2 : (sorted[mid] ?? 0);
  return {
    attempts: valid.length,
    bestMs: sorted[0] ?? 0,
    averageMs: Math.round(valid.reduce((sum, ms) => sum + ms, 0) / valid.length),
    medianMs: Math.round(median),
  };
}
