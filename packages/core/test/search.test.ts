import { describe, expect, it } from "vitest";
import { isValidCrosshairCode, type AgentSummary } from "@valhub/domain";
import type { ContentAdapter } from "../src/adapters/types";
import { EDITORIAL_CROSSHAIRS, listCrosshairPresets } from "../src/crosshair-presets";
import { UnifiedSearch } from "../src/services/search";

const jett = { id: "jett", slug: "jett", name: "Jett", role: "DUELIST", iconUrl: "https://media.valorant-api.com/jett.png" } as AgentSummary;

function content(overrides: Partial<ContentAdapter> = {}): ContentAdapter {
  return {
    getAgents: async () => [jett],
    getMaps: async () => [],
    getWeapons: async () => [],
    getCosmetics: async () => ({ items: [] }),
    ...overrides,
  } as unknown as ContentAdapter;
}

describe("editorial crosshair presets", () => {
  it("are all valid in-game codes", () => {
    expect(EDITORIAL_CROSSHAIRS.length).toBeGreaterThan(0);
    for (const p of EDITORIAL_CROSSHAIRS) expect(isValidCrosshairCode(p.code)).toBe(true);
  });
  it("filter by tag", () => {
    expect(listCrosshairPresets("dot").map((p) => p.id)).toEqual(["editorial-dot"]);
    expect(listCrosshairPresets()).toHaveLength(EDITORIAL_CROSSHAIRS.length);
  });
});

describe("UnifiedSearch (on-device)", () => {
  it("finds agents and crosshairs without any server source", async () => {
    const search = new UnifiedSearch(content(), () => listCrosshairPresets());
    const res = await search.search("jett", "en");
    expect(res.groups.map((g) => g.kind)).toEqual(["agent"]);
    const dots = await search.search("dot", "en");
    expect(dots.groups.find((g) => g.kind === "crosshair")?.results).toHaveLength(1);
  });
  it("reports a failing content source as degraded but still returns crosshairs", async () => {
    const search = new UnifiedSearch(content({ getAgents: async () => { throw new Error("down"); } }), () => listCrosshairPresets());
    const res = await search.search("dot", "en");
    expect(res.degraded).toContain("content");
    expect(res.groups.some((g) => g.kind === "crosshair")).toBe(true);
  });
});
