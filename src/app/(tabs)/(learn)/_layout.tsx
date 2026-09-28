import { TabStack } from "@/components/navigation/TabStack";
import { useT } from "@/i18n";

export default function LearnStack() {
  const { t } = useT();
  return <TabStack screen="learn" title={t("tabs.learn")} />;
}
