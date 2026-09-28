import { storeResetLocalTime, syncLocalReminders, type ReminderPreferences } from "@/notifications/reminders";

function fakeNotifications() {
  const scheduled = new Map<string, unknown>();
  const cancelled: string[] = [];
  return {
    scheduled,
    cancelled,
    api: {
      SchedulableTriggerInputTypes: { DAILY: "daily" },
      cancelScheduledNotificationAsync: async (id: string) => {
        cancelled.push(id);
        scheduled.delete(id);
      },
      scheduleNotificationAsync: async (req: { identifier: string; trigger: unknown }) => {
        scheduled.set(req.identifier, req.trigger);
        return req.identifier;
      },
    },
  };
}

const copy = {
  storeRefresh: { title: "Store refreshed", body: "New offers" },
  trainingReminder: { title: "Warm up", body: "Five minutes" },
};

describe("storeResetLocalTime", () => {
  it("converts the 00:00 UTC store reset into local wall-clock time", () => {
    const reset = new Date(Date.UTC(2026, 8, 26, 0, 0));
    expect(storeResetLocalTime(new Date(Date.UTC(2026, 8, 26, 15, 0)))).toEqual({ hour: reset.getHours(), minute: reset.getMinutes() });
  });
});

describe("syncLocalReminders", () => {
  it("schedules enabled reminders daily and cancels disabled ones", async () => {
    const n = fakeNotifications();
    const prefs: ReminderPreferences = { storeRefresh: true, trainingReminder: false };
    await syncLocalReminders(prefs, n.api as never, copy);
    expect([...n.scheduled.keys()]).toEqual(["reminder-storeRefresh"]);
    expect(n.scheduled.get("reminder-storeRefresh")).toMatchObject({ type: "daily" });
    expect(n.cancelled).toContain("reminder-trainingReminder");
  });

  it("re-syncing replaces instead of duplicating", async () => {
    const n = fakeNotifications();
    await syncLocalReminders({ storeRefresh: true, trainingReminder: true }, n.api as never, copy);
    await syncLocalReminders({ storeRefresh: true, trainingReminder: true }, n.api as never, copy);
    expect(n.scheduled.size).toBe(2);
  });
});
