import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useTheme } from "@/design/theme";
import { useT } from "@/i18n";

/**
 * System tab bar: Liquid Glass on iOS 26+, a standard translucent bar on older iOS and a
 * Material 3 navigation bar on Android. Icons are SF Symbols (iOS) and Material Symbols (Android).
 */
export default function TabsLayout() {
  const t = useTheme();
  const { t: tr } = useT();
  return (
    <NativeTabs
      minimizeBehavior="onScrollDown"
      tintColor={t.colors.accent}
      backgroundColor={process.env.EXPO_OS === "android" ? t.colors.surface : undefined}
      indicatorColor={t.colors.accentSubtle}
      iconColor={{ default: t.colors.textSecondary, selected: t.colors.accent }}
      labelStyle={{ default: { color: t.colors.textSecondary }, selected: { color: t.colors.accent } }}
    >
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} md="home" />
        <NativeTabs.Trigger.Label>{tr("tabs.home")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(performance)">
        <NativeTabs.Trigger.Icon sf="chart.xyaxis.line" md="insights" />
        <NativeTabs.Trigger.Label>{tr("tabs.performance")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(learn)">
        <NativeTabs.Trigger.Icon sf={{ default: "book", selected: "book.fill" }} md="menu_book" />
        <NativeTabs.Trigger.Label>{tr("tabs.learn")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(library)">
        <NativeTabs.Trigger.Icon sf={{ default: "bookmark", selected: "bookmark.fill" }} md="bookmark" />
        <NativeTabs.Trigger.Label>{tr("tabs.library")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
