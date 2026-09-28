import { Platform } from "react-native";
import * as Device from "expo-device";
import { getPreference, setPreference } from "@/data/cache/db";
import { getNotifications } from "./native";
import { DEFAULT_REMINDERS, syncLocalReminders, type ReminderCopy, type ReminderPreferences } from "./reminders";

export { REMINDER_CATEGORIES, type ReminderCategory, type ReminderPreferences } from "./reminders";

/** Everything off by default; each reminder is an explicit opt-in. */
export function loadReminders(): ReminderPreferences {
  return { ...DEFAULT_REMINDERS, ...getPreference<Partial<ReminderPreferences>>("reminderPrefs", {}) };
}

getNotifications()?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export type PermissionOutcome = "granted" | "denied" | "unsupported";

async function ensurePermission(): Promise<PermissionOutcome> {
  const Notifications = getNotifications();
  if (!Notifications || !Device.isDevice) return "unsupported";
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", { name: "Default", importance: Notifications.AndroidImportance.DEFAULT });
  }
  let status = (await Notifications.getPermissionsAsync()).status;
  if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
  return status === "granted" ? "granted" : "denied";
}

/**
 * Saves reminder preferences and reschedules the on-device notifications. Permission is only
 * requested when the user switches a reminder on (contextual ask).
 */
export async function applyReminders(prefs: ReminderPreferences, copy: ReminderCopy): Promise<PermissionOutcome> {
  const turningOn = Object.values(prefs).some(Boolean);
  const outcome = turningOn ? await ensurePermission() : "granted";
  const Notifications = getNotifications();
  if (outcome !== "granted" || !Notifications) return Notifications ? outcome : "unsupported";
  setPreference("reminderPrefs", prefs);
  await syncLocalReminders(prefs, Notifications, copy);
  return "granted";
}

/** Only in-app relative paths are accepted from notification payloads. */
export function safeNotificationPath(data: unknown): string | undefined {
  const url = (data as { url?: unknown } | undefined)?.url;
  if (typeof url !== "string" || !url.startsWith("/") || url.startsWith("//")) return undefined;
  return url;
}
