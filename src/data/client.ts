import type { z } from "zod";
import { responses } from "@valhub/api-contract";
import { AppError } from "@valhub/domain";

type ResponseKey = keyof typeof responses;

export function asAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  return new AppError("UPSTREAM", "Unexpected error", { cause: error });
}

/**
 * Runs an on-device loader and validates its result against the shared contract before it
 * reaches UI code; a mismatch is a VALIDATION error, not silently-wrong data.
 */
export async function call<K extends ResponseKey>(key: K, loader: () => unknown): Promise<z.infer<(typeof responses)[K]>> {
  let data: unknown;
  try {
    data = await loader();
  } catch (error) {
    throw asAppError(error);
  }
  const parsed = responses[key].safeParse(data);
  if (!parsed.success) throw new AppError("VALIDATION", `Result did not match contract (${String(key)})`);
  return parsed.data as z.infer<(typeof responses)[K]>;
}
