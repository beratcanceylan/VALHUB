import { Platform, View } from "react-native";
import { Stack, router } from "expo-router";
import { IconButton } from "@/components/ui";
import { useTheme } from "@/design/theme";
import { useT } from "@/i18n";

const IS_IOS = Platform.OS === "ios";
/** iOS 26+ draws Liquid Glass bars itself; older iOS needs an explicit blur behind a transparent header. */
const HAS_LIQUID_GLASS = IS_IOS && Number.parseInt(String(Platform.Version), 10) >= 26;

function AndroidHeaderActions() {
  const t = useTheme();
  const { t: tr } = useT();
  return (
    <View style={{ flexDirection: "row", marginRight: -t.space[2] }}>
      <IconButton icon="search" label={tr("common.search")} onPress={() => router.push("/search")} />
      <IconButton icon="settings" label={tr("common.settings")} onPress={() => router.push("/settings")} />
    </View>
  );
}

/**
 * Native stack for one tab root. iOS gets a large, translucent title bar with SF Symbol bar
 * buttons; Android gets a Material top app bar with the same actions.
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
              headerTransparent: true,
              headerLargeTitleShadowVisible: false,
              headerLargeStyle: { backgroundColor: "transparent" },
              headerBlurEffect: HAS_LIQUID_GLASS ? "none" : "systemChromeMaterial",
              headerTitleStyle: { color: t.colors.textPrimary },
              unstable_headerRightItems: () => [
                { type: "button", label: tr("common.search"), icon: { type: "sfSymbol", name: "magnifyingglass" }, onPress: () => router.push("/search") },
                { type: "button", label: tr("common.settings"), icon: { type: "sfSymbol", name: "gearshape" }, onPress: () => router.push("/settings") },
              ],
            }
          : {
              headerStyle: { backgroundColor: t.colors.background },
              headerTitleStyle: { fontWeight: "600", fontSize: t.fontSize.title },
              headerRight: () => <AndroidHeaderActions />,
            }),
      }}
    >
      <Stack.Screen name={screen} options={{ title }} />
    </Stack>
  );
}
