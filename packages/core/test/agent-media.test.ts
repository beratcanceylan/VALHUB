import { describe, expect, it } from "vitest";
import type { Agent, AppLocale } from "@valhub/domain";
import { getAgentMedia, type AgentMediaSources } from "../src/services/agent-media";

const agent = {
  id: "harbor",
  name: "Harbor",
  abilities: [
    { slot: "C", name: "Cascade" },
    { slot: "E", name: "High Tide" },
    { slot: "PASSIVE", name: "Tide" },
  ],
} as unknown as Agent;

const source = { provider: "playvalorant", fetchedAt: "2026-09-26T00:00:00.000Z" } as const;

function sources(pages: Partial<Record<AppLocale, string[]>>): AgentMediaSources & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    content: { getAgent: async () => agent } as never,
    playValorant: {
      getAgentMedia: async (_slug: string, locale: AppLocale) => {
        calls.push(locale);
        const names = pages[locale];
        if (!names) throw new Error("404");
        return { abilities: names.map((abilityName) => ({ abilityName, videoUrl: `https://cmsassets.rgpub.io/${abilityName}.mp4` })), source };
      },
    } as never,
  };
}

describe("getAgentMedia", () => {
  it("matches videos to ability slots by name, ignoring case and punctuation", async () => {
    const res = await getAgentMedia(sources({ en: ["CASCADE", "high-tide"] }), "harbor", "en");
    expect(res.abilities.map((a) => a.slot)).toEqual(["C", "E"]);
  });
  it("falls back to the English page when the localized page is missing", async () => {
    const s = sources({ en: ["Cascade"] });
    const res = await getAgentMedia(s, "harbor", "tr");
    expect(s.calls).toEqual(["tr", "en"]);
    expect(res.abilities[0]?.slot).toBe("C");
  });
});
