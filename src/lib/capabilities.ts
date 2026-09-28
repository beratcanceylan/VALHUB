import { useMemo } from "react";
import { localCapabilities } from "@valhub/core";
import type { CapabilityState, ProviderCapability } from "@valhub/domain";
import { useSession } from "@/auth/session";

/** Capability flags are computed on-device from the session, so they are known immediately. */
export function useCapability(capability: ProviderCapability): CapabilityState | undefined {
  const { signedIn } = useSession();
  return useMemo(() => localCapabilities({ signedIn }).find((c) => c.capability === capability), [signedIn, capability]);
}
