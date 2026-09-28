import { API_VERSION, type Bootstrap } from "@valhub/api-contract";
import { POLICY_DEFAULTS, PROVIDER_CAPABILITIES, type AppLocale, type CapabilityState, type ProviderCapability } from "@valhub/domain";
import { WIKI_BASE, WIKI_LICENSE, WIKI_LICENSE_URL } from "../adapters/wiki/adapter";

/** Hosts the app may load remote images/video from (the media policy allowlist). */
export const MEDIA_HOSTS = [
  "media.valorant-api.com",
  "cmsassets.rgpub.io",
  "wiki.playvalorant.com",
  "images.contentstack.io",
  // Skin level/chroma preview videos (valorant-api `streamedVideo`).
  "valorant.dyn.riotcdn.net",
] as const;

const KEYLESS: ReadonlySet<ProviderCapability> = new Set(["PLAYER_IDENTITY", "GAME_CONTENT", "AGENT_VIDEOS", "WIKI", "NEWS"]);
const ACCOUNT: ReadonlySet<ProviderCapability> = new Set(["MATCHES", "LEADERBOARD", "PERSONAL_STORE"]);

/** Capabilities are decided on-device: knowing what the app can do never needs the network. */
export function localCapabilities({ signedIn }: { signedIn: boolean }): CapabilityState[] {
  return PROVIDER_CAPABILITIES.map((capability): CapabilityState => {
    if (capability === "AUDIO") return { ...POLICY_DEFAULTS.AUDIO };
    if (KEYLESS.has(capability)) return { capability, available: true };
    if (ACCOUNT.has(capability)) return signedIn ? { capability, available: true } : { capability, available: false, reason: "SIGN_IN_REQUIRED" };
    return { capability, available: false, reason: "NOT_CONFIGURED" };
  });
}

export function buildBootstrap({ locale, signedIn }: { locale: AppLocale; signedIn: boolean }): Bootstrap {
  return {
    apiVersion: API_VERSION,
    locale,
    capabilities: localCapabilities({ signedIn }),
    allowedMediaHosts: [...MEDIA_HOSTS],
    attribution: {
      wiki: { name: "VALORANT Wiki", url: `${WIKI_BASE}/en-us/`, license: WIKI_LICENSE, licenseUrl: WIKI_LICENSE_URL },
      valorantApi: { name: "Valorant-API", url: "https://valorant-api.com/" },
      riotLegal:
        "VALHUB is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.",
    },
  };
}
