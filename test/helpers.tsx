import type { ReactNode } from "react";
import { ThemeProvider } from "@/design/theme";
import { I18nProvider } from "@/i18n";

export function Providers({ children, scheme = "light" }: Readonly<{ children: ReactNode; scheme?: "light" | "dark" }>) {
  return (
    <I18nProvider>
      <ThemeProvider preference={scheme}>{children}</ThemeProvider>
    </I18nProvider>
  );
}
