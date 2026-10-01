import { TabStack } from "@/components/navigation/TabStack";
import { useT } from "@/i18n";

export default function PerformanceStack() {
  const { t } = useT();
  return <TabStack screen="performance" title={t("tabs.performance")} />;
}
