import { TabStack } from "@/components/navigation/TabStack";
import { useT } from "@/i18n";

export default function LibraryStack() {
  const { t } = useT();
  return <TabStack screen="library" title={t("tabs.library")} />;
}
