import { act, renderHook } from "@testing-library/react-native";

const mockFavorites = new Set<string>();
jest.mock("@/data/repositories/library", () => ({
  favorites: {
    has: (type: string, id: string) => mockFavorites.has(`${type}:${id}`),
    add: (type: string, id: string) => mockFavorites.add(`${type}:${id}`),
    remove: (type: string, id: string) => mockFavorites.delete(`${type}:${id}`),
  },
}));
jest.mock("expo-crypto", () => ({ randomUUID: () => "uuid-1" }));
jest.mock("@/auth/session", () => ({ useSession: () => ({ signedIn: false }) }));

jest.mock("expo-device", () => ({ __esModule: true, isDevice: true }));
jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  getPermissionsAsync: jest.fn(async () => ({ status: "undetermined" })),
  requestPermissionsAsync: jest.fn(async () => ({ status: "granted" })),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: "daily" },
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  scheduleNotificationAsync: jest.fn(async () => "id"),
}));

import { setPreference } from "@/data/cache/db";
import { analytics } from "@/analytics";
import { applyReminders, loadReminders, safeNotificationPath } from "@/notifications";
import { getNotifications } from "@/notifications/native";
import { useCapability } from "@/lib/capabilities";
import { formatBytes, formatPercent, SLOT_ORDER } from "@/lib/format";
import { newId } from "@/lib/id";
import { presetName, presetTag } from "@/lib/presets";
import { useFavorite } from "@/lib/useFavorite";

const mockDevice = jest.requireMock<{ isDevice: boolean }>("expo-device");
const mockNotifications = jest.requireMock<{ setNotificationHandler: jest.Mock; requestPermissionsAsync: jest.Mock }>("expo-notifications");

const copy = {
  storeRefresh: { title: "Store", body: "New offers" },
  trainingReminder: { title: "Warm up", body: "Five minutes" },
};

describe("notifications", () => {
  it("only accepts in-app relative paths", () => {
    expect(safeNotificationPath({ url: "/store" })).toBe("/store");
    expect(safeNotificationPath({ url: "//evil.example" })).toBeUndefined();
    expect(safeNotificationPath({ url: "https://evil.example" })).toBeUndefined();
    expect(safeNotificationPath(undefined)).toBeUndefined();
  });

  it("starts with every reminder off and asks permission only when turning one on", async () => {
    expect(Object.values(loadReminders()).some(Boolean)).toBe(false);
    expect(getNotifications()).toBe(mockNotifications);
    expect(mockNotifications.setNotificationHandler).toHaveBeenCalled();

    expect(await applyReminders(loadReminders(), copy)).toBe("granted");
    expect(mockNotifications.requestPermissionsAsync).not.toHaveBeenCalled();

    const on = Object.fromEntries(Object.keys(loadReminders()).map((k) => [k, true])) as ReturnType<typeof loadReminders>;
    expect(await applyReminders(on, copy)).toBe("granted");
    expect(mockNotifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(setPreference).toHaveBeenCalledWith("reminderPrefs", on);

    mockNotifications.requestPermissionsAsync.mockResolvedValueOnce({ status: "denied" });
    expect(await applyReminders(on, copy)).toBe("denied");
    mockDevice.isDevice = false;
    expect(await applyReminders(on, copy)).toBe("unsupported");
    mockDevice.isDevice = true;
  });
});

describe("analytics", () => {
  it("sends events to the configured sink unless disabled", () => {
    const send = jest.fn();
    analytics.setSink({ send });
    analytics.track("screen_view", { screen: "home" });
    analytics.track("crosshair_saved");
    expect(send).toHaveBeenCalledWith("screen_view", { screen: "home" });
    expect(send).toHaveBeenCalledWith("crosshair_saved", undefined);
  });
});

describe("lib helpers", () => {
  it("formats sizes and percentages", () => {
    expect([formatBytes(512), formatBytes(2048), formatBytes(3 * 1024 * 1024)]).toEqual(["512 B", "2 KB", "3.0 MB"]);
    expect(formatPercent(0.256, 1)).toBe("25.6%");
    expect(SLOT_ORDER[0]).toBe("C");
    expect(newId()).toBe("uuid-1");
  });

  it("localizes editorial presets and tags", () => {
    const t = (key: string) => (key === "crosshair.tag.pro" ? key : `tr:${key}`);
    expect(presetName(t as never, { id: "editorial-dot", name: "Dot" })).toBe("tr:crosshair.presetName.dot");
    expect(presetName(t as never, { id: "custom", name: "Mine" })).toBe("Mine");
    expect(presetTag(t as never, "pro")).toBe("pro");
    expect(presetTag(t as never, "tactical")).toBe("tr:crosshair.tag.tactical");
  });

  it("toggles favorites and reads capabilities", async () => {
    const { result } = await renderHook(() => useFavorite("AGENT", "jett", "Jett"));
    expect(result.current.saved).toBe(false);
    await act(async () => {
      expect(result.current.toggle()).toBe(true);
    });
    expect(result.current.saved).toBe(true);
    await act(async () => {
      expect(result.current.toggle()).toBe(false);
    });

    const capability = await renderHook(() => useCapability("GAME_CONTENT"));
    expect(capability.result.current?.available).toBe(true);
  });
});
