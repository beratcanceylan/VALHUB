import { View } from "react-native";
import { Stack, router } from "expo-router";
import { Button, EmptyState } from "@/components/ui";
import { useTheme } from "@/design/theme";
import { useT } from "@/i18n";

export default function NotFound() {
  const t = useTheme();
  const { t: tr } = useT();
  return (
    <View style={{ flex: 1, justifyContent: "center", backgroundColor: t.colors.background }}>
      <Stack.Screen options={{ title: "" }} />
      <EmptyState title={tr("notFound.title")} action={<Button label={tr("notFound.home")} onPress={() => router.replace("/")} />} />
    </View>
  );
}
