import { useMemo, useState } from "react";
import { View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Stack, router, useLocalSearchParams } from "expo-router";
import {
  CrosshairCodeError,
  defaultCrosshairSettings,
  enableAds,
  generateCrosshairCode,
  parseCrosshairCode,
  type CrosshairProfile,
  type CrosshairSettings,
} from "@valhub/domain";
import { analytics } from "@/analytics";
import { Button, InlineError, Screen, SegmentedControl, Surface, Switch, TextInput, useToast } from "@/components/ui";
import { savedCrosshairs } from "@/data/repositories/library";
import { useTheme } from "@/design/theme";
import { useT } from "@/i18n";
import { CodeBar } from "./CodeBar";
import { PreviewStage } from "./PreviewStage";
import { ProfileEditor } from "./ProfileEditor";
import { SniperEditor } from "./SniperEditor";

type Tab = "primary" | "ads" | "sniper";

function initialSettings(code: string): CrosshairSettings {
  try {
    return parseCrosshairCode(code);
  } catch {
    return defaultCrosshairSettings();
  }
}

/**
 * Crosshair builder covering every in-game setting (primary, ADS, sniper). The code at the
 * top is regenerated on every change and pastes straight into VALORANT.
 */
export default function CrosshairBuilderScreen() {
  const t = useTheme();
  const { t: tr } = useT();
  const toast = useToast();
  const params = useLocalSearchParams<{ id?: string; code?: string; name?: string }>();
  const existing = params.id ? savedCrosshairs.get(params.id) : undefined;
  const [settings, setSettings] = useState<CrosshairSettings>(() => initialSettings(existing?.code ?? params.code ?? "0"));
  const [tab, setTab] = useState<Tab>("primary");
  const [importError, setImportError] = useState<string | undefined>(undefined);
  const [name, setName] = useState(existing?.name ?? params.name ?? tr("crosshair.defaultName"));
  const code = useMemo(() => generateCrosshairCode(settings), [settings]);

  const profile: CrosshairProfile = tab === "ads" && settings.ads ? settings.ads : settings.primary;
  const setProfile = (next: CrosshairProfile) => setSettings((s) => (tab === "ads" && s.ads ? { ...s, ads: next } : { ...s, primary: next }));

  const importCode = (value: string) => {
    try {
      setSettings(parseCrosshairCode(value));
      setImportError(undefined);
      toast(tr("crosshair.imported"));
    } catch (e) {
      setImportError(e instanceof CrosshairCodeError ? tr(`crosshair.invalid.${e.reason}`) : tr("crosshair.invalid.SHAPE"));
    }
  };

  const save = () => {
    const id = savedCrosshairs.save({
      ...(existing ? { id: existing.id } : {}),
      name: name.trim() || tr("crosshair.defaultName"),
      code,
    });
    analytics.track("crosshair_saved");
    toast(tr("common.saved"));
    if (!existing) router.replace({ pathname: "/crosshairs/editor", params: { id } });
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: tr("crosshair.title") }} />
      <PreviewStage profile={profile} settings={settings} sniper={tab === "sniper"} />

      <View style={{ marginTop: t.space[4] }}>
        <CodeBar code={code} onPaste={importCode} />
        {importError ? (
          <View style={{ marginTop: t.space[2] }}>
            <InlineError message={importError} />
          </View>
        ) : null}
      </View>

      <View style={{ marginTop: t.space[4] }}>
        <SegmentedControl
          label={tr("crosshair.title")}
          value={tab}
          onChange={setTab}
          options={(["primary", "ads", "sniper"] as const).map((v) => ({ value: v, label: tr(`crosshair.profiles.${v}`) }))}
        />
      </View>

      <Animated.View key={tab} entering={FadeIn.duration(180)}>
        {tab === "sniper" ? (
          <SniperEditor settings={settings} onChange={setSettings} />
        ) : (
          <>
            {tab === "ads" ? (
              <View style={{ marginTop: t.space[4] }}>
                <Surface>
                  <Switch
                    label={tr("crosshair.adsSeparate")}
                    description={tr("crosshair.adsSeparateBody")}
                    value={!!settings.ads}
                    onValueChange={(on) =>
                      setSettings((s) => {
                        if (on) return enableAds(s);
                        const { ads: _ads, ...rest } = s;
                        return rest;
                      })
                    }
                  />
                </Surface>
                {settings.ads ? (
                  <Button
                    label={tr("crosshair.copyFromPrimary")}
                    icon="copy"
                    variant="ghost"
                    size="sm"
                    style={{ alignSelf: "flex-start", marginTop: t.space[2] }}
                    onPress={() => setSettings((s) => enableAds(s))}
                  />
                ) : null}
              </View>
            ) : null}
            {tab === "primary" || settings.ads ? <ProfileEditor profile={profile} onChange={setProfile} /> : null}
          </>
        )}
      </Animated.View>

      <View style={{ height: t.space[6] }} />
      <TextInput label={tr("crosshair.name")} value={name} onChangeText={setName} maxLength={40} />
      <Button label={tr("crosshair.save")} icon="saved" haptic style={{ marginTop: t.space[3] }} onPress={save} />
    </Screen>
  );
}
