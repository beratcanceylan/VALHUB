import type { AppLocale } from "@valhub/domain";
import type { ContentAdapter, OfficialAgentMediaAdapter } from "../adapters/types";
import { officialAgentSlug } from "../adapters/valorant-api/mapper";

export interface AgentMediaSources {
  content: Pick<ContentAdapter, "getAgent">;
  playValorant: Pick<OfficialAgentMediaAdapter, "getAgentMedia">;
}

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/** Combined official names ("Nebula / Dissipate") only match by containment, so this is a scan, not a lookup. */
function slotContaining<S extends string>(known: ReadonlyArray<{ slot: S; name: string }>, name: string): S | undefined {
  for (const ability of known) {
    if (ability.slot !== "PASSIVE" && (name.includes(ability.name) || ability.name.includes(name))) return ability.slot;
  }
  return undefined;
}

/** Official ability videos for an agent, each tagged with the ability slot it belongs to. */
export async function getAgentMedia({ content, playValorant }: AgentMediaSources, id: string, locale: AppLocale) {
  const agent = await content.getAgent(id, locale);
  const slug = officialAgentSlug(agent.name);
  let media;
  try {
    media = await playValorant.getAgentMedia(slug, locale);
  } catch (error) {
    // Localized official page may not exist; retry with English before failing.
    if (locale === "en") throw error;
    media = await playValorant.getAgentMedia(slug, "en");
  }
  const known = agent.abilities.map((a) => ({ slot: a.slot, name: norm(a.name) }));
  // Reversed so the first ability wins when two normalize to the same name (matches `find`).
  const slotByName = new Map(known.map((a) => [a.name, a.slot] as const).reverse());
  return {
    agentId: agent.id,
    abilities: media.abilities.map((m) => {
      const name = norm(m.abilityName);
      // Exact name first; then containment for combined names ("Nebula / Dissipate").
      const slot =
        slotByName.get(name) ?? slotContaining(known, name);
      return { ...m, ...(slot ? { slot } : {}) };
    }),
    source: media.source,
  };
}
