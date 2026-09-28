import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, View } from "react-native";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { Stack, router } from "expo-router";
import { parseRedirect, RIOT_LOGIN_URL, RIOT_REDIRECT_PREFIX } from "@valhub/core";
import { useSession } from "@/auth/session";
import { Button, Icon, Text } from "@/components/ui";
import { useTheme } from "@/design/theme";
import { useT } from "@/i18n";

const RIOT_LOGOUT_URL = "https://auth.riotgames.com/logout";

type Phase = "logout" | "login" | "finishing" | "done" | "failed";

/** Thin top bar that tracks WebView load progress and fades out when the page is ready. */
function LoadBar({ progress, visible }: Readonly<{ progress: number; visible: boolean }>) {
  const t = useTheme();
  const [width] = useState(() => new Animated.Value(0));
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    Animated.timing(width, { toValue: progress, duration: t.motion.base, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [progress, width, t.motion.base]);
  useEffect(() => {
    Animated.timing(opacity, { toValue: visible ? 1 : 0, duration: t.motion.slow, useNativeDriver: false }).start();
  }, [visible, opacity, t.motion.slow]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        height: 2,
        opacity,
        backgroundColor: t.colors.accent,
        width: width.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
      }}
    />
  );
}

/** Check mark that pops in once the account is connected. */
function Connected() {
  const t = useTheme();
  const { t: tr } = useT();
  const [scale] = useState(() => new Animated.Value(0.6));
  const [fade] = useState(() => new Animated.Value(0));
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(tr("auth.success"));
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: t.motion.base, useNativeDriver: true }),
    ]).start();
  }, [scale, fade, t.motion.base, tr]);
  return (
    <Animated.View style={{ alignItems: "center", gap: t.space[3], opacity: fade, transform: [{ scale }] }}>
      <View style={{ width: 64, height: 64, borderRadius: t.radius.full, backgroundColor: t.colors.positiveSubtle, alignItems: "center", justifyContent: "center" }}>
        <Icon name="check" size={30} color="positive" />
      </View>
      <Text variant="titleSm" weight="semibold">
        {tr("auth.success")}
      </Text>
    </Animated.View>
  );
}

/**
 * Riot's own sign-in page in a WebView. VALHUB never sees the password: we only read the
 * short-lived tokens from the final redirect. Riot's cookies stay in the WebView, so renewing
 * an expired session usually completes without typing anything.
 */
export default function RiotLoginScreen() {
  const t = useTheme();
  const { t: tr } = useT();
  const session = useSession();
  const [phase, setPhase] = useState<Phase>(session.needsFreshLogin ? "logout" : "login");
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const handled = useRef(false);

  const onUrl = (url: string): boolean => {
    if (!url.startsWith(RIOT_REDIRECT_PREFIX)) return true;
    if (handled.current) return false;
    handled.current = true;
    const tokens = parseRedirect(url);
    if (!tokens) {
      setPhase("failed");
      return false;
    }
    setPhase("finishing");
    session.completeLogin(tokens).then(
      () => {
        setPhase("done");
        setTimeout(() => router.back(), 900);
      },
      () => setPhase("failed"),
    );
    return false;
  };

  const retry = () => {
    handled.current = false;
    setProgress(0);
    setPhase("login");
  };

  const webVisible = phase === "login" || phase === "logout";

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <Stack.Screen options={{ title: tr("auth.riotTitle") }} />
      <LoadBar progress={progress} visible={webVisible && loading} />
      <View
        style={{ flexDirection: "row", alignItems: "center", gap: t.space[2], paddingHorizontal: t.space[4], paddingVertical: t.space[2], borderBottomWidth: t.borderWidth.hairline, borderBottomColor: t.colors.divider }}
      >
        <Icon name="user" size={14} color="textTertiary" />
        <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
          {tr("auth.trustNote")}
        </Text>
      </View>

      {webVisible ? (
        <WebView
          key={phase}
          source={{ uri: phase === "logout" ? RIOT_LOGOUT_URL : RIOT_LOGIN_URL }}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          originWhitelist={["https://*"]}
          onShouldStartLoadWithRequest={(req) => onUrl(req.url)}
          onNavigationStateChange={(nav: WebViewNavigation) => {
            onUrl(nav.url);
          }}
          onLoadStart={() => setLoading(true)}
          onLoadProgress={(e) => setProgress(e.nativeEvent.progress)}
          onLoadEnd={() => {
            setLoading(false);
            // Logging out of Riot first clears the previous account's cookies.
            if (phase === "logout") setPhase("login");
          }}
          onError={() => setPhase("failed")}
          style={{ flex: 1, backgroundColor: t.colors.background }}
        />
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: t.space[6], gap: t.space[4] }}>
          {phase === "finishing" ? <Text color="textSecondary">{tr("auth.linking")}</Text> : null}
          {phase === "done" ? <Connected /> : null}
          {phase === "failed" ? (
            <>
              <Icon name="alert" size={28} color="warning" />
              <Text align="center">{tr("auth.failed")}</Text>
              <Button label={tr("common.retry")} variant="secondary" icon="refresh" onPress={retry} />
            </>
          ) : null}
        </View>
      )}
    </View>
  );
}
