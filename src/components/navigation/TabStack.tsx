import { Platform, View } from "react-native";
import { Stack, router } from "expo-router";
import { IconButton } from "@/components/ui";
import { useTheme } from "@/design/theme";
import { useT } from "@/i18n";

const IS_IOS = Platform.OS === "ios";

function AndroidHeaderActions() {
  const t = useTheme();
  const { t: tr } = useT();
  return (
    <View style={{ flexDirection: "row", marginRight: -t.space[2] }}>
      <IconButton icon="settings" label={tr("common.settings")} onPress={() => router.push("/settings")} />
    </View>
  );
}

/**
 * Native stack for one tab root. iOS gets a large, translucent title bar with an SF Symbol bar
 * button; Android gets a flat app bar in the app's own colors. Search lives in the tab bar, so
 * headers only carry Settings.
 */
export function TabStack({ screen, title }: Readonly<{ screen: string; title: string }>) {
  const t = useTheme();
  const { t: tr } = useT();
  return (
    <Stack
      screenOptions={{
        headerTintColor: t.colors.textPrimary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: t.colors.background },
        ...(IS_IOS
          ? {
              headerLargeTitleEnabled: true,
              headerLargeTitleShadowVisible: false,
              headerStyle: { backgroundColor: t.colors.background },
              headerLargeStyle: { backgroundColor: t.colors.background },
              headerTitleStyle: { color: t.colors.textPrimary },
              unstable_headerRightItems: () => [
                { type: "button", label: tr("common.settings"), icon: { type: "sfSymbol", name: "gearshape" }, onPress: () => router.push("/settings") },
              ],
            }
          : {
              headerStyle: { backgroundColor: t.colors.background },
              headerTitleStyle: { fontWeight: "700", fontSize: t.fontSize.title },
              headerRight: AndroidHeaderActions,
            }),
      }}
    >
      <Stack.Screen name={screen} options={{ title }} />
    </Stack>
  );
}
