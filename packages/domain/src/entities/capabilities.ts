export const PROVIDER_CAPABILITIES = [
  "PLAYER_IDENTITY",
  "MATCHES",
  "LEADERBOARD",
  "GAME_CONTENT",
  "AGENT_VIDEOS",
  "WIKI",
  "NEWS",
  "AUDIO",
  "PERSONAL_STORE",
] as const;

export type ProviderCapability = (typeof PROVIDER_CAPABILITIES)[number];

export type CapabilityUnavailableReason =
  | "NOT_CONFIGURED"
  | "POLICY_BLOCKED"
  | "RIGHTS_UNCLEARED"
  | "UPSTREAM_DOWN"
  /** Needs a Riot account session on this device. */
  | "SIGN_IN_REQUIRED";

export interface CapabilityState {
  capability: ProviderCapability;
  available: boolean;
  reason?: CapabilityUnavailableReason;
}

/**
 * Capabilities whose production default is fixed by policy, not by configuration.
 * Changing either of these requires a documented Riot approval / rights clearance.
 */
export const POLICY_DEFAULTS = {
  AUDIO: { capability: "AUDIO", available: false, reason: "RIGHTS_UNCLEARED" },
} as const satisfies Record<string, CapabilityState>;

export type CapabilityMap = Record<ProviderCapability, CapabilityState>;
