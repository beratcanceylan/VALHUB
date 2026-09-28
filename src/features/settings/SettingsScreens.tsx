import { useState } from "react";
import { Linking as RNLinking, View } from "react-native";
import { Stack, router } from "expo-router";
import Constants from "expo-constants";
import { Image } from "expo-image";
import { useQueryClient } from "@tanstack/react-query";
import { SUPPORTED_LOCALES, type AppLocale } from "@valhub/domain";
import { analytics } from "@/analytics";
import { useSession } from "@/auth/session";
import { Button, Icon, InlineError, ListRow, RowGroup, Screen, SectionHeader, SegmentedControl, Surface, Switch, Text, useToast } from "@/components/ui";
import { QUERY_CACHE_MAX_BYTES, QUERY_CACHE_MAX_ROWS, clearQueryCache, getPreference, queryCacheStats, setPreference } from "@/data/cache/db";
import { useAppearance } from "@/design/preference";
import { useTheme } from "@/design/theme";
import { useT } from "@/i18n";
import { LOCALE_NAMES } from "@/i18n/translate";
import { formatBytes } from "@/lib/format";
import { applyReminders, loadReminders, REMINDER_CATEGORIES, type ReminderCategory, type ReminderPreferences } from "@/notifications";

function useAccountTitle(): string {
  const { t } = useT();
  const session = useSession();
  if (session.profile) return t("settings.linkedAs", { name: `${session.profile.gameName}#${session.profile.tagLine}` });
  return session.signedIn ? t("settings.account") : t("settings.notLinked");
}

export function SettingsScreen() {
  const t = useTheme();
  const { t: tr, locale } = useT();
  const { preference, setThemePreference } = useAppearance();
  const session = useSession();
  const accountTitle = useAccountTitle();

  return (
    <Screen>
      <Stack.Screen options={{ title: tr("settings.title") }} />
      <SectionHeader title={tr("settings.theme")} />
      <SegmentedControl
        label={tr("settings.theme")}
        value={preference}
        onChange={setThemePreference}
        options={(["system", "light", "dark"] as const).map((v) => ({ value: v, label: tr(`settings.themes.${v}`) }))}
      />

      <SectionHeader title={tr("settings.general")} />
      <RowGroup>
        <ListRow icon="learn" title={tr("settings.language")} meta={LOCALE_NAMES[locale]} onPress={() => router.push("/settings/language")} />
        <ListRow icon="bell" title={tr("settings.notifications")} onPress={() => router.push("/settings/notifications")} />
        <ListRow icon="user" title={tr("settings.privacy")} onPress={() => router.push("/settings/privacy")} />
        <ListRow icon="layers" title={tr("settings.cache")} onPress={() => router.push("/settings/cache")} />
      </RowGroup>

      <SectionHeader title={tr("settings.account")} />
      <RowGroup>
        <ListRow icon="user" title={accountTitle} chevron={false} />
        {session.signedIn ? <ListRow title={tr("settings.signOut")} onPress={() => void session.signOut()} /> : null}
      </RowGroup>

      <SectionHeader title={tr("settings.about")} />
      <RowGroup>
        <ListRow title={tr("settings.version", { v: Constants.expoConfig?.version ?? "0" })} chevron={false} />
      </RowGroup>
      {/* Riot's fan-content policy requires this notice once in the app. */}
      <Text variant="caption" color="textTertiary" style={{ marginTop: t.space[3], marginBottom: t.space[4] }}>
        {tr("settings.legal")}
      </Text>
    </Screen>
  );
}

export function LanguageScreen() {
  const { t, preference, setLocale } = useT();
  const options: Array<AppLocale | "system"> = ["system", ...SUPPORTED_LOCALES];
  return (
    <Screen>
      <Stack.Screen options={{ title: t("settings.language") }} />
      <RowGroup>
        {options.map((o) => (
          <ListRow
            key={o}
            title={o === "system" ? t("settings.themes.system") : LOCALE_NAMES[o]}
            chevron={false}
            {...(preference === o ? { trailing: <Icon name="check" color="accent" /> } : {})}
            onPress={() => setLocale(o)}
          />
        ))}
      </RowGroup>
    </Screen>
  );
}

export function NotificationSettingsScreen() {
  const { t } = useT();
  const [prefs, setPrefs] = useState<ReminderPreferences>(loadReminders);
  const [status, setStatus] = useState<"ok" | "denied" | "unsupported">("ok");

  const toggle = async (category: ReminderCategory, enabled: boolean) => {
    const next = { ...prefs, [category]: enabled };
    setPrefs(next);
    analytics.track("notification_preference_changed", { category, enabled });
    const copy = {
      storeRefresh: { title: t("notifications.push.storeRefresh.title"), body: t("notifications.push.storeRefresh.body") },
      trainingReminder: { title: t("notifications.push.trainingReminder.title"), body: t("notifications.push.trainingReminder.body") },
    };
    const outcome = await applyReminders(next, copy).catch(() => "unsupported" as const);
    setStatus(outcome === "granted" ? "ok" : outcome);
    // Permission refused or unsupported: switch back so the toggle never lies.
    if (outcome !== "granted") setPrefs(loadReminders());
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: t("notifications.title") }} />
      <Text weight="semibold">{t("notifications.explainTitle")}</Text>
      <Text variant="bodySm" color="textSecondary" style={{ marginTop: 4, marginBottom: 12 }}>
        {t("notifications.explainBody")}
      </Text>
      {status === "denied" ? (
        <View style={{ marginBottom: 12, gap: 8 }}>
          <InlineError message={t("notifications.permissionDenied")} />
          <Button label={t("notifications.openSettings")} variant="secondary" size="sm" style={{ alignSelf: "flex-start" }} onPress={() => void RNLinking.openSettings()} />
        </View>
      ) : null}
      {status === "unsupported" ? (
        <View style={{ marginBottom: 12 }}>
          <InlineError message={t("notifications.devBuildOnly")} />
        </View>
      ) : null}
      <RowGroup>
        {REMINDER_CATEGORIES.map((c) => (
          <Switch key={c} label={t(`notifications.categories.${c}.title`)} description={t(`notifications.categories.${c}.body`)} value={prefs[c]} onValueChange={(v) => void toggle(c, v)} />
        ))}
      </RowGroup>
    </Screen>
  );
}

export function PrivacyScreen() {
  const { t } = useT();
  const [analyticsEnabled, setAnalyticsEnabled] = useState(() => getPreference("analyticsEnabled", true));
  return (
    <Screen>
      <Stack.Screen options={{ title: t("privacy.title") }} />
      <Text>{t("privacy.body")}</Text>
      <Text variant="bodySm" color="textSecondary" style={{ marginTop: 12 }}>
        {t("privacy.riotData")}
      </Text>
      <SectionHeader title={t("privacy.analytics")} />
      <Surface>
        <Switch
          label={t("privacy.analytics")}
          description={t("privacy.analyticsBody")}
          value={analyticsEnabled}
          onValueChange={(v) => {
            setPreference("analyticsEnabled", v);
            setAnalyticsEnabled(v);
          }}
        />
      </Surface>
    </Screen>
  );
}

export function CacheScreen() {
  const { t } = useT();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [stats, setStats] = useState(queryCacheStats);
  return (
    <Screen>
      <Stack.Screen options={{ title: t("cache.title") }} />
      <RowGroup>
        <ListRow title={t("cache.entries", { n: stats.rows })} chevron={false} />
        <ListRow title={t("cache.size", { size: formatBytes(stats.bytes) })} chevron={false} />
      </RowGroup>
      <Text variant="caption" color="textTertiary" style={{ marginTop: 8 }}>
        {t("cache.limit", { rows: QUERY_CACHE_MAX_ROWS, size: formatBytes(QUERY_CACHE_MAX_BYTES) })}
      </Text>
      <Button
        label={t("cache.clear")}
        variant="secondary"
        style={{ marginTop: 16 }}
        onPress={() => {
          clearQueryCache();
          queryClient.clear();
          setStats(queryCacheStats());
          toast(t("cache.cleared"));
        }}
      />
      <Button
        label={t("cache.images")}
        variant="ghost"
        style={{ marginTop: 8 }}
        onPress={() => {
          void Promise.all([Image.clearDiskCache(), Image.clearMemoryCache()]).then(() => toast(t("cache.cleared")));
        }}
      />
    </Screen>
  );
}
