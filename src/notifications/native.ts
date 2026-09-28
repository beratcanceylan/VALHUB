import { Platform } from "react-native";
import { isRunningInExpoGo } from "expo";

type NotificationsModule = typeof import("expo-notifications");

let cached: NotificationsModule | null | undefined;

/**
 * expo-notifications throws on import in Expo Go on Android (removed in SDK 53), which would take
 * down every module that imports it — including the root layout. Load it lazily and treat
 * notifications as unsupported there; development and store builds get the real module.
 */
export function getNotifications(): NotificationsModule | null {
  if (cached !== undefined) return cached;
  if (Platform.OS === "android" && isRunningInExpoGo()) {
    cached = null;
    return cached;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy on purpose, see above
    cached = require("expo-notifications") as NotificationsModule;
  } catch {
    cached = null;
  }
  return cached;
}
