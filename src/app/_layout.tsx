import { useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { SessionProvider, useSession } from "@/auth/session";
import { ToastProvider } from "@/components/ui";
import { createQueryClient, useBootstrap } from "@/data/queries";
import { setAllowedMediaHosts } from "@/data/media-policy";
import { evictQueryCache } from "@/data/cache/db";
import { AppearanceProvider } from "@/design/preference";
import { useTheme } from "@/design/theme";
import { I18nProvider, useT } from "@/i18n";
import { safeNotificationPath } from "@/notifications";
import { getNotifications } from "@/notifications/native";

function BootstrapEffects() {
  const { signedIn } = useSession();
  const bootstrap = useBootstrap(signedIn);
  useEffect(() => {
    if (bootstrap.data) setAllowedMediaHosts(bootstrap.data.allowedMediaHosts);
  }, [bootstrap.data]);
  useEffect(() => {
    evictQueryCache();
  }, []);
  useEffect(() => {
    const sub = getNotifications()?.addNotificationResponseReceivedListener((response) => {
      const path = safeNotificationPath(response.notification.request.content.data);
      if (path) router.push(path as never);
    });
    return () => sub?.remove();
  }, []);
  return null;
}

/** Navigation theme derived from our tokens so native bars, back buttons and transitions match. */
function useNavigationTheme() {
  const t = useTheme();
  return useMemo(() => {
    const base = t.scheme === "dark" ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: t.colors.accent,
        background: t.colors.background,
        card: t.colors.background,
        text: t.colors.textPrimary,
        border: t.colors.divider,
        notification: t.colors.accent,
      },
    };
  }, [t]);
}

function Shell() {
  const t = useTheme();
  const { t: tr } = useT();
  const navigationTheme = useNavigationTheme();
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(t.colors.background).catch(() => undefined);
  }, [t.colors.background]);
  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={t.scheme === "dark" ? "light" : "dark"} />
      <BootstrapEffects />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.textPrimary,
          headerTitleStyle: { fontWeight: "600" },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: "minimal",
          contentStyle: { backgroundColor: t.colors.background },
          animation: "default",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ title: tr("search.title"), animation: "fade" }} />
        <Stack.Screen name="auth/riot" options={{ title: "", presentation: "modal" }} />
      </Stack>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <I18nProvider>
          <AppearanceProvider>
            <QueryClientProvider client={queryClient}>
              <SessionProvider>
                <ToastProvider>
                  <Shell />
                </ToastProvider>
              </SessionProvider>
            </QueryClientProvider>
          </AppearanceProvider>
        </I18nProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
