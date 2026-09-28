import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { useQueryClient } from "@tanstack/react-query";
import { isExpired, type RiotSession, type RiotTokens } from "@valhub/core";
import { AppError, type PlayerProfile } from "@valhub/domain";
import { analytics } from "@/analytics";
import { core } from "@/data/core";
import { getPreference, setPreference } from "@/data/cache/db";
import { useLocale } from "@/i18n";
import { decodeStoredTokens, encodeTokens } from "./tokens";

const TOKENS_KEY = "valhub.riot";
/** After sign-out the next login must clear Riot's cookies, or the WebView would silently log the old account back in. */
const FRESH_LOGIN_KEY = "riotFreshLogin";

interface SessionValue {
  ready: boolean;
  signedIn: boolean;
  /** Signed in before, but the ~1 h Riot token ran out; a login round-trip renews it (usually without typing). */
  expired: boolean;
  profile: PlayerProfile | undefined;
  /** Whether the login screen must log out of Riot first (after an explicit sign-out). */
  needsFreshLogin: boolean;
  /** The live Riot session. Throws AppError("UNAUTHORIZED") when signed out or expired. */
  requireRiot: () => Promise<RiotSession>;
  completeLogin: (tokens: RiotTokens) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: Readonly<{ children: ReactNode }>) {
  const queryClient = useQueryClient();
  const locale = useLocale();
  const [ready, setReady] = useState(false);
  const [tokens, setTokens] = useState<RiotTokens | undefined>(undefined);
  const [expired, setExpired] = useState(false);
  const [profile, setProfile] = useState<PlayerProfile | undefined>(undefined);
  const [needsFreshLogin, setNeedsFreshLogin] = useState(() => getPreference<boolean>(FRESH_LOGIN_KEY, false));
  const tokensRef = useRef<RiotTokens | undefined>(undefined);
  const sessionRef = useRef<Promise<RiotSession> | undefined>(undefined);

  const requireRiot = useCallback(async (): Promise<RiotSession> => {
    const current = tokensRef.current;
    if (!current) throw new AppError("UNAUTHORIZED", "Not signed in to Riot");
    if (isExpired(current)) {
      setExpired(true);
      throw new AppError("UNAUTHORIZED", "Riot session expired");
    }
    sessionRef.current ??= core.riot.establish(current).catch((error: unknown) => {
      sessionRef.current = undefined;
      throw error;
    });
    return sessionRef.current;
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      setProfile(await core.riot.profile(await requireRiot(), locale));
    } catch {
      // Profile is decorative in Settings; player screens surface their own errors.
    }
  }, [requireRiot, locale]);

  useEffect(() => {
    void SecureStore.getItemAsync(TOKENS_KEY)
      .then((raw) => {
        const stored = decodeStoredTokens(raw);
        tokensRef.current = stored;
        setTokens(stored);
        if (stored && isExpired(stored)) setExpired(true);
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (tokens && !isExpired(tokens)) void loadProfile();
  }, [tokens, loadProfile]);

  const completeLogin = useCallback(
    async (next: RiotTokens) => {
      tokensRef.current = next;
      sessionRef.current = undefined;
      await SecureStore.setItemAsync(TOKENS_KEY, encodeTokens(next));
      setPreference(FRESH_LOGIN_KEY, false);
      setNeedsFreshLogin(false);
      setTokens(next);
      setExpired(false);
      await queryClient.invalidateQueries({ queryKey: ["player"] });
      analytics.track("riot_link_completed");
    },
    [queryClient],
  );

  const signOut = useCallback(async () => {
    tokensRef.current = undefined;
    sessionRef.current = undefined;
    await SecureStore.deleteItemAsync(TOKENS_KEY);
    setPreference(FRESH_LOGIN_KEY, true);
    setNeedsFreshLogin(true);
    setTokens(undefined);
    setExpired(false);
    setProfile(undefined);
    queryClient.removeQueries({ queryKey: ["player"] });
  }, [queryClient]);

  const value = useMemo<SessionValue>(
    () => ({ ready, signedIn: !!tokens, expired, profile, needsFreshLogin, requireRiot, completeLogin, signOut }),
    [ready, tokens, expired, profile, needsFreshLogin, requireRiot, completeLogin, signOut],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}
