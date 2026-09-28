import type * as ExpoNotifications from "expo-notifications";

/** Reminders scheduled on the device itself: no push server involved. */
export type ReminderCategory = "storeRefresh" | "trainingReminder";
export type ReminderPreferences = Record<ReminderCategory, boolean>;
export type ReminderCopy = Record<ReminderCategory, { title: string; body: string }>;

export const REMINDER_CATEGORIES: readonly ReminderCategory[] = ["storeRefresh", "trainingReminder"];
export const DEFAULT_REMINDERS: ReminderPreferences = { storeRefresh: false, trainingReminder: false };

type NotificationsApi = Pick<typeof ExpoNotifications, "scheduleNotificationAsync" | "cancelScheduledNotificationAsync" | "SchedulableTriggerInputTypes">;

const TRAINING_TIME = { hour: 19, minute: 0 };

/** The daily store resets at 00:00 UTC; this is that moment on the user's clock. */
export function storeResetLocalTime(now = new Date()): { hour: number; minute: number } {
  const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0));
  return { hour: reset.getHours(), minute: reset.getMinutes() };
}

/** Makes the scheduled reminders match `prefs`: one daily notification per enabled category. */
export async function syncLocalReminders(prefs: ReminderPreferences, notifications: NotificationsApi, copy: ReminderCopy): Promise<void> {
  // Categories are independent; within one, cancel-then-schedule keeps it from duplicating.
  await Promise.all(
    REMINDER_CATEGORIES.map(async (category) => {
      const identifier = `reminder-${category}`;
      await notifications.cancelScheduledNotificationAsync(identifier);
      if (!prefs[category]) return;
      const time = category === "storeRefresh" ? storeResetLocalTime() : TRAINING_TIME;
      await notifications.scheduleNotificationAsync({
        identifier,
        content: { ...copy[category], data: { url: category === "storeRefresh" ? "/store" : "/tools/reaction" } },
        trigger: { type: notifications.SchedulableTriggerInputTypes.DAILY, ...time },
      });
    }),
  );
}
