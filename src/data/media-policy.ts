/**
 * Remote media host allowlist. Seeded with the hosts our providers use and replaced by the
 * on-device bootstrap configuration. URLs from other hosts are never rendered.
 */
let allowedHosts = new Set<string>([
  "media.valorant-api.com",
  "cmsassets.rgpub.io",
  "wiki.playvalorant.com",
  "images.contentstack.io",
  "valorant.dyn.riotcdn.net",
]);

export function setAllowedMediaHosts(hosts: readonly string[]): void {
  if (hosts.length > 0) allowedHosts = new Set(hosts);
}

export function isAllowedMediaUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && allowedHosts.has(parsed.host);
  } catch {
    return false;
  }
}
