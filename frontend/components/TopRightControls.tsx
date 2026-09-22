import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import type { Theme } from "@/lib/theme-config";

type Props = {
  theme: Theme;
  authenticated: boolean;
};

export default function TopRightControls({ theme, authenticated, className }: Props & { className?: string }) {
  return (
    <div
      className={
        className ??
        "absolute right-6 top-6 z-20 flex items-center gap-1 rounded-lg border border-border bg-surface p-1 shadow-sm"
      }
    >
      <LanguageSwitcher />
      <ThemeToggle theme={theme} authenticated={authenticated} />
    </div>
  );
}
