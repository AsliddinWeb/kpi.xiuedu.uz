"use client";

import { IconDots } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { isNavItemActive, visibleNavItems } from "./nav-items";

const MAIN_COUNT = 4;

export default function MobileTabBar({ role, navBadges }: { role: string; navBadges: Record<string, number> }) {
  const t = useTranslations("nav");
  const tc = useTranslations("topbar");
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const items = visibleNavItems(role);
  const showMore = items.length > MAIN_COUNT + 1;
  const mainItems = showMore ? items.slice(0, MAIN_COUNT) : items;
  const overflowItems = showMore ? items.slice(MAIN_COUNT) : [];

  return (
    <>
      {moreOpen && (
        <button
          type="button"
          aria-label="Close"
          onClick={() => setMoreOpen(false)}
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
        />
      )}

      {moreOpen && (
        <div className="fixed inset-x-0 bottom-16 z-40 rounded-t-2xl border-t border-border bg-surface p-3 shadow-lg lg:hidden">
          <div className="grid grid-cols-3 gap-2">
            {overflowItems.map(({ key, href, icon: Icon }) => {
              const badge = navBadges[key];
              return (
                <Link
                  key={key}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className={[
                    "flex flex-col items-center gap-1.5 rounded-lg px-2 py-3 text-xs font-medium",
                    isNavItemActive(pathname, href)
                      ? "bg-accent-soft text-accent"
                      : "text-text-2 hover:bg-surface-alt hover:text-text-1",
                  ].join(" ")}
                >
                  <span className="relative">
                    <Icon size={20} stroke={2} />
                    {!!badge && (
                      <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold leading-none text-white">
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </span>
                  <span className="text-center leading-tight">{t(key)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-20 flex items-stretch border-t-2 border-t-accent/70 bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_-8px_rgba(0,0,0,0.15)] lg:hidden">
        {mainItems.map(({ key, href, icon: Icon }) => {
          const active = isNavItemActive(pathname, href);
          const badge = navBadges[key];
          return (
            <Link
              key={key}
              href={href}
              onClick={() => setMoreOpen(false)}
              className={[
                "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium",
                active ? "text-accent" : "text-text-2",
              ].join(" ")}
            >
              <span className="relative">
                <Icon size={20} stroke={2} />
                {!!badge && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold leading-none text-white">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </span>
              <span>{t(key)}</span>
            </Link>
          );
        })}
        {showMore && (
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className={[
              "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium",
              moreOpen || overflowItems.some((item) => isNavItemActive(pathname, item.href)) ? "text-accent" : "text-text-2",
            ].join(" ")}
          >
            <span className="relative">
              <IconDots size={20} stroke={2} />
              {overflowItems.some((item) => navBadges[item.key]) && (
                <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-danger" />
              )}
            </span>
            <span>{tc("more")}</span>
          </button>
        )}
      </nav>
    </>
  );
}
