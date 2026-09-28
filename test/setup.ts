/* Native modules without JS fallbacks in the Jest environment. */
jest.mock("expo-video", () => ({
  useVideoPlayer: jest.fn(() => ({ play: jest.fn(), status: "idle" })),
  VideoView: () => null,
}));

jest.mock("@/data/cache/db", () => ({
  getPreference: (_key: string, fallback: unknown) => fallback,
  setPreference: jest.fn(),
}));

jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US" }],
  getCalendars: () => [{ timeZone: "UTC" }],
}));
