import { randomUUID } from "expo-crypto";

/** Collision-resistant local id. */
export function newId(): string {
  return randomUUID();
}
