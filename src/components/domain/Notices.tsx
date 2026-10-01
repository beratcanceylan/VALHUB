import { View } from "react-native";
import type { CapabilityState } from "@valhub/domain";
import { useTheme } from "@/design/theme";
import { useT } from "@/i18n";
import { Button, Icon, Text } from "@/components/ui";

/** Honest capability explanation instead of fake content. */
export function CapabilityNotice({ state, title, body, action }: Readonly<{ state?: CapabilityState; title: string; body?: string; action?: { label: string; onPress: () => void } }>) {
  const t = useTheme();
  const { t: tr } = useT();
  return (
    <View style={{ borderWidth: t.borderWidth.hairline, borderColor: t.colors.border, borderRadius: t.radius.md, padding: t.space[4], gap: t.space[2], backgroundColor: t.colors.surface }}>
      <View style={{ flexDirection: "row", gap: t.space[2], alignItems: "center" }}>
        <Icon name="alert" size={18} color="textSecondary" />
        <Text weight="semibold" style={{ flex: 1 }}>
          {title}
        </Text>
      </View>
      <Text variant="bodySm" color="textSecondary">
        {body ?? (state?.reason ? tr(`capability.${state.reason}`) : "")}
      </Text>
      {action ? <Button label={action.label} onPress={action.onPress} size="sm" style={{ alignSelf: "flex-start", marginTop: t.space[1] }} /> : null}
    </View>
  );
}
