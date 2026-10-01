import { Platform } from "react-native";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { BottomInsetHandledContext } from "@/components/ui";
import { useTheme } from "@/design/theme";
import { useT } from "@/i18n";
import { SEARCH_TAB } from "./tabs";

const IS_IOS = Platform.OS === "ios";
/** iOS 26 renders the tab bar as Liquid Glass and splits the search role into its own glass button. */
const HAS_LIQUID_GLASS = IS_IOS && Number.parseInt(String(Platform.Version), 10) >= 26;

/**
 * The platform tab bar on both platforms: UITabBarController on iOS (Liquid Glass on 26+, with
 * Search as its own glass control), Material 3 bottom navigation on Android. Icons are SF Symbols
 * on iOS and Material Symbols on Android.
 */
export function SystemTabs() {
  const t = useTheme();
  const { t: tr } = useT();
  return (
    // The native bar already sits above the system navigation bar / home indicator.
    <BottomInsetHandledContext.Provider value>
      <NativeTabs
        minimizeBehavior="onScrollDown"
        tintColor={t.colors.accent}
        backgroundColor={t.colors.surface}
        iconColor={IS_IOS ? undefined : { default: t.colors.textSecondary, selected: t.colors.accent }}
        indicatorColor={t.colors.surfaceSunken}
        labelStyle={IS_IOS ? undefined : { default: { color: t.colors.textSecondary }, selected: { color: t.colors.accent, fontWeight: "600" } }}
        rippleColor={t.colors.surfaceSunken}
        // Solid bar: no blur material on iOS 18 and earlier (iOS 26 Liquid Glass is drawn by the OS).
        {...(IS_IOS && !HAS_LIQUID_GLASS ? { blurEffect: "none" as const } : {})}
      >
        <NativeTabs.Trigger name="(home)">
          <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} md="home" />
          <NativeTabs.Trigger.Label>{tr("tabs.home")}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(guide)">
          <NativeTabs.Trigger.Icon sf={{ default: "book", selected: "book.fill" }} md="menu_book" />
          <NativeTabs.Trigger.Label>{tr("tabs.guide")}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(library)">
          <NativeTabs.Trigger.Icon sf={{ default: "bookmark", selected: "bookmark.fill" }} md="bookmarks" />
          <NativeTabs.Trigger.Label>{tr("tabs.library")}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(account)">
          <NativeTabs.Trigger.Icon sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }} md="account_circle" />
          <NativeTabs.Trigger.Label>{tr("tabs.account")}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        {/* Kept last so iOS 26 can detach it and merge it with the screen's search field. */}
        <NativeTabs.Trigger name={SEARCH_TAB.name} role="search">
          <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
          <NativeTabs.Trigger.Label>{tr("common.search")}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </BottomInsetHandledContext.Provider>
  );
}
