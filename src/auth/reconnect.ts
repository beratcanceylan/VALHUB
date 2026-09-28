import { AppError } from "@valhub/domain";

/** A player query failed because the Riot session is missing or expired: offer a reconnect, not an error. */
export function needsReconnect(error: unknown): boolean {
  return error instanceof AppError && error.code === "UNAUTHORIZED";
}
