import Link from "next/link";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import type { Theme } from "@/lib/theme-config";
import NotificationsMenu from "./NotificationsMenu";
import ProfileMenu from "./ProfileMenu";
import TopSearch from "./TopSearch";

type TopbarUser = {
  full_name: string;
  email: string;
  role: string;
};

export default function Topbar({
  user,
  theme,
  brandName,
  brandLogoUrl,
}: {
  user: TopbarUser;
  theme: Theme;
  brandName?: string | null;
  brandLogoUrl?: string | null;
}) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-surface-glass px-4 py-3.5 shadow-soft backdrop-blur-md lg:gap-4 lg:px-6">
      <span className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-accent/50 via-accent/10 to-transparent" aria-hidden />

      <Link
        href="/dashboard"
        className="flex shrink-0 items-center gap-2.5 border-r border-border pr-3.5 lg:hidden"
      >
        {brandLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brandLogoUrl}
            alt={brandName ?? "Logo"}
            className="h-8 w-8 shrink-0 rounded-lg border border-border bg-white object-contain p-1 shadow-soft"
          />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-[#3646c9] text-sm font-bold text-white shadow-[0_2px_10px_-1px_rgba(76,95,238,0.5)]">
            {(brandName ?? "KPI Platform").charAt(0).toUpperCase()}
          </div>
        )}
        <span className="max-w-[7rem] truncate text-sm font-semibold tracking-tight text-text-1 sm:max-w-[10rem]">
          {brandName ?? "KPI Platform"}
        </span>
      </Link>

      <TopSearch role={user.role} />

      <div className="ml-auto flex items-center gap-1.5">
        <LanguageSwitcher />
        <ThemeToggle theme={theme} authenticated />
        <NotificationsMenu />
        <div className="ml-1 border-l border-border pl-2.5">
          <ProfileMenu user={user} />
        </div>
      </div>
    </header>
  );
}
