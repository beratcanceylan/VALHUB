import { TabStack } from "@/components/navigation/TabStack";
import { useT } from "@/i18n";

export default function SearchStack() {
  const { t } = useT();
  return <TabStack screen="search" title={t("search.title")} />;
}
