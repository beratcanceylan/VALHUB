import { View } from "react-native";
import { Stack } from "expo-router";
import { Screen, Text } from "@/components/ui";
import { useTheme } from "@/design/theme";
import { useT } from "@/i18n";
import { LEGAL_EFFECTIVE_DATE, legalDocument, type LegalDocumentId } from "@/legal/documents";

/** Long-form legal text: plain reading layout, no cards. */
function LegalScreen({ id }: Readonly<{ id: LegalDocumentId }>) {
  const t = useTheme();
  const { t: tr, locale, formatDateTime } = useT();
  const sections = legalDocument(locale, id);
  const translated = locale === "en" || locale === "tr";
  return (
    <Screen>
      <Stack.Screen options={{ title: tr(id === "privacy" ? "privacy.policy" : "privacy.terms") }} />
      <Text variant="bodySm" color="textSecondary">
        {tr("privacy.effective", { date: formatDateTime(`${LEGAL_EFFECTIVE_DATE}T12:00:00Z`, { dateStyle: "long" }) })}
      </Text>
      {translated ? null : (
        <Text variant="bodySm" color="textSecondary" style={{ marginTop: t.space[1] }}>
          {tr("privacy.englishOnly")}
        </Text>
      )}
      {sections.map((s) => (
        <View key={s.heading} style={{ marginTop: t.space[6], gap: t.space[2] }}>
          <Text variant="titleSm" weight="semibold" accessibilityRole="header">
            {s.heading}
          </Text>
          <Text color="textSecondary">{s.body}</Text>
        </View>
      ))}
    </Screen>
  );
}

export function PrivacyPolicyScreen() {
  return <LegalScreen id="privacy" />;
}

export function TermsScreen() {
  return <LegalScreen id="terms" />;
}
