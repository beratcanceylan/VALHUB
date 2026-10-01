import { TabStack } from "@/components/navigation/TabStack";
import { useT } from "@/i18n";

export default function AccountStack() {
  const { t } = useT();
  return <TabStack screen="account" title={t("tabs.account")} />;
}
