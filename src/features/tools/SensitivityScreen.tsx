import { useState } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { SENSITIVITY_GAMES, cmPer360, convertSensitivity, edpi, roundTo, sensitivityForNewDpi, type SensitivityGame } from "@valhub/domain";
import { Button, ChipRow, FilterChip, Metric, Screen, SectionHeader, Surface, Text, TextInput, useToast } from "@/components/ui";
import { getPreference, setPreference } from "@/data/cache/db";
import { useTheme } from "@/design/theme";
import { useT } from "@/i18n";

const GAMES = Object.keys(SENSITIVITY_GAMES) as SensitivityGame[];

function parsePositive(value: string): number | undefined {
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export default function SensitivityScreen() {
  const t = useTheme();
  const { t: tr, formatNumber } = useT();
  const toast = useToast();
  const saved = getPreference("sensitivity", { dpi: "800", sens: "0.35", from: "valorant", to: "cs2", newDpi: "1600" });
  const [dpiText, setDpiText] = useState(saved.dpi);
  const [sensText, setSensText] = useState(saved.sens);
  const [from, setFrom] = useState<SensitivityGame>(saved.from as SensitivityGame);
  const [to, setTo] = useState<SensitivityGame>(saved.to as SensitivityGame);
  const [newDpiText, setNewDpiText] = useState(saved.newDpi);

  const dpi = parsePositive(dpiText);
  const sens = parsePositive(sensText);
  const newDpi = parsePositive(newDpiText);
  const persist = (patch: Partial<typeof saved>) => setPreference("sensitivity", { dpi: dpiText, sens: sensText, from, to, newDpi: newDpiText, ...patch });

  const converted = sens !== undefined ? roundTo(convertSensitivity(from, to, sens), 4) : undefined;
  const forNewDpi = dpi && sens && newDpi ? roundTo(sensitivityForNewDpi(dpi, sens, newDpi), 4) : undefined;

  return (
    <Screen>
      <Stack.Screen options={{ title: tr("sensitivity.title") }} />
      <View style={{ flexDirection: "row", gap: t.space[3] }}>
        <View style={{ flex: 1 }}>
          <TextInput
            label={tr("sensitivity.dpi")}
            value={dpiText}
            keyboardType="number-pad"
            onChangeText={(v) => {
              setDpiText(v);
              persist({ dpi: v });
            }}
            {...(dpi === undefined ? { error: tr("sensitivity.invalid") } : {})}
          />
        </View>
        <View style={{ flex: 1 }}>
          <TextInput
            label={tr("sensitivity.sens")}
            value={sensText}
            keyboardType="decimal-pad"
            onChangeText={(v) => {
              setSensText(v);
              persist({ sens: v });
            }}
            {...(sens === undefined ? { error: tr("sensitivity.invalid") } : {})}
          />
        </View>
      </View>

      <SectionHeader title={SENSITIVITY_GAMES[from].name} />
      <Surface padded>
        <View style={{ flexDirection: "row", gap: t.space[3] }}>
          <Metric label={tr("sensitivity.edpi")} value={dpi && sens ? formatNumber(edpi(dpi, sens), 1) : "—"} />
          <Metric label={tr("sensitivity.cm360")} value={dpi && sens ? formatNumber(cmPer360(from, dpi, sens), 1) : "—"} />
        </View>
      </Surface>

      <SectionHeader title={tr("sensitivity.convert")} />
      <Text variant="bodySm" color="textSecondary" style={{ marginBottom: t.space[2] }}>
        {tr("sensitivity.from")}
      </Text>
      <ChipRow>
        {GAMES.map((g) => (
          <FilterChip
            key={g}
            label={SENSITIVITY_GAMES[g].name}
            selected={from === g}
            onPress={() => {
              setFrom(g);
              persist({ from: g });
            }}
          />
        ))}
      </ChipRow>
      <Text variant="bodySm" color="textSecondary" style={{ marginVertical: t.space[2] }}>
        {tr("sensitivity.to")}
      </Text>
      <ChipRow>
        {GAMES.map((g) => (
          <FilterChip
            key={g}
            label={SENSITIVITY_GAMES[g].name}
            selected={to === g}
            onPress={() => {
              setTo(g);
              persist({ to: g });
            }}
          />
        ))}
      </ChipRow>
      <Surface padded style={{ marginTop: t.space[3] }}>
        <Metric label={tr("sensitivity.result")} value={converted !== undefined ? String(converted) : "—"} detail={SENSITIVITY_GAMES[to].name} />
        {converted !== undefined ? (
          <Button
            label={tr("common.copy")}
            icon="copy"
            variant="secondary"
            size="sm"
            style={{ alignSelf: "flex-start" }}
            onPress={() => {
              void Clipboard.setStringAsync(String(converted));
              toast(tr("common.copied"));
            }}
          />
        ) : null}
      </Surface>

      <SectionHeader title={tr("sensitivity.keepFeel")} />
      <TextInput
        label={tr("sensitivity.newDpi")}
        value={newDpiText}
        keyboardType="number-pad"
        onChangeText={(v) => {
          setNewDpiText(v);
          persist({ newDpi: v });
        }}
        {...(newDpi === undefined ? { error: tr("sensitivity.invalid") } : {})}
      />
      <Surface padded style={{ marginTop: t.space[3] }}>
        <Metric label={tr("sensitivity.sens")} value={forNewDpi !== undefined ? String(forNewDpi) : "—"} detail={SENSITIVITY_GAMES[from].name} />
      </Surface>

      <Button
        label={tr("common.clear")}
        variant="ghost"
        style={{ marginTop: t.space[4] }}
        onPress={() => {
          setDpiText("800");
          setSensText("0.35");
          setNewDpiText("1600");
          persist({ dpi: "800", sens: "0.35", newDpi: "1600" });
        }}
      />
    </Screen>
  );
}
