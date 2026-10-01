import { TabStack } from "@/components/navigation/TabStack";
import { useT } from "@/i18n";

export default function GuideStack() {
  const { t } = useT();
  return <TabStack screen="guide" title={t("tabs.guide")} />;
}
