/**
 * Mouse sensitivity math. Conversions are based on each game's degrees-per-count ("yaw")
 * at sensitivity 1. Only games whose yaw is well established and linear are listed;
 * games with non-linear or FOV-dependent formulas are deliberately omitted rather than
 * approximated.
 */
export const SENSITIVITY_GAMES = {
  valorant: { name: "VALORANT", yaw: 0.07 },
  cs2: { name: "Counter-Strike 2", yaw: 0.022 },
  apex: { name: "Apex Legends", yaw: 0.022 },
  overwatch2: { name: "Overwatch 2", yaw: 0.0066 },
} as const;

export type SensitivityGame = keyof typeof SENSITIVITY_GAMES;

export class SensitivityInputError extends Error {
  readonly field: "dpi" | "sensitivity";
  constructor(field: "dpi" | "sensitivity", message: string) {
    super(message);
    this.name = "SensitivityInputError";
    this.field = field;
  }
}

function assertPositive(field: "dpi" | "sensitivity", value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new SensitivityInputError(field, `${field} must be a positive number`);
  }
}

export function edpi(dpi: number, sensitivity: number): number {
  assertPositive("dpi", dpi);
  assertPositive("sensitivity", sensitivity);
  return dpi * sensitivity;
}

/** Physical mouse travel for a full 360° turn, in centimetres. */
export function cmPer360(game: SensitivityGame, dpi: number, sensitivity: number): number {
  assertPositive("dpi", dpi);
  assertPositive("sensitivity", sensitivity);
  const degreesPerInch = dpi * sensitivity * SENSITIVITY_GAMES[game].yaw;
  return (360 / degreesPerInch) * 2.54;
}

/** Sensitivity in `to` that yields the same cm/360 as `sensitivity` in `from` at the same DPI. */
export function convertSensitivity(from: SensitivityGame, to: SensitivityGame, sensitivity: number): number {
  assertPositive("sensitivity", sensitivity);
  return (sensitivity * SENSITIVITY_GAMES[from].yaw) / SENSITIVITY_GAMES[to].yaw;
}

/** Sensitivity that keeps eDPI constant when changing mouse DPI. */
export function sensitivityForNewDpi(currentDpi: number, sensitivity: number, newDpi: number): number {
  assertPositive("dpi", currentDpi);
  assertPositive("dpi", newDpi);
  assertPositive("sensitivity", sensitivity);
  return (currentDpi * sensitivity) / newDpi;
}

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
