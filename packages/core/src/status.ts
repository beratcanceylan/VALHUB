import { RIOT_LOCALE, type AppLocale, type PlatformIncident, type PlatformStatus, type RiotRegion } from "@valhub/domain";
import { MINUTE, type TtlCache } from "./lib/cache";
import { fetchJson } from "./lib/http";

interface DtoStatusEntry {
  id: number;
  incident_severity: string | null;
  titles: Array<{ locale: string; content: string }>;
  updates: Array<{ translations: Array<{ locale: string; content: string }>; created_at: string }>;
  created_at: string;
  updated_at: string | null;
}

interface DtoStatus {
  maintenances: DtoStatusEntry[];
  incidents: DtoStatusEntry[];
}

function toIncident(entry: DtoStatusEntry, locale: string): PlatformIncident {
  const title = entry.titles.find((t) => t.locale === locale) ?? entry.titles.find((t) => t.locale === "en_US") ?? entry.titles[0];
  const latest = entry.updates[0];
  const message = latest?.translations.find((t) => t.locale === locale) ?? latest?.translations[0];
  const incident: PlatformIncident = {
    id: String(entry.id),
    title: title?.content ?? "Service notice",
    severity: entry.incident_severity ?? "info",
    createdAt: entry.created_at,
  };
  if (entry.updated_at) incident.updatedAt = entry.updated_at;
  if (message) incident.message = message.content;
  return incident;
}

/** Riot's public status feed: same data as the keyed status API, no key needed. */
export async function getPlatformStatus(region: RiotRegion, locale: AppLocale, cache: TtlCache): Promise<PlatformStatus> {
  const riotLocale = RIOT_LOCALE[locale].replace("-", "_");
  return cache.getOrLoad(`status:${region}:${riotLocale}`, { ttlMs: 30_000, staleIfErrorMs: 10 * MINUTE }, async () => {
    const dto = await fetchJson<DtoStatus>(`https://valorant.secure.dyn.riotcdn.net/channels/public/x/status/${region}.json`);
    return {
      region,
      maintenances: dto.maintenances.map((m) => toIncident(m, riotLocale)),
      incidents: dto.incidents.map((i) => toIncident(i, riotLocale)),
    };
  });
}
