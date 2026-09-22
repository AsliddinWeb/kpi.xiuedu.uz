"use client";

import { IconChevronsLeft } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ATTENTION_BADGE_KEYS, groupedNavItems, isNavItemActive } from "./nav-items";

export default function Sidebar({
  role,
  collapsed,
  onToggle,
  brandName,
  brandLogoUrl,
  navBadges,
}: {
  role: string;
  collapsed: boolean;
  onToggle: () => void;
  brandName: string | null;
  brandLogoUrl: string | null;
  navBadges: Record<string, number>;
}) {
  const t = useTranslations("nav");
  const tc = useTranslations("topbar");
  const pathname = usePathname();
  const groups = groupedNavItems(role);

  const labelClass = collapsed ? "opacity-0 duration-100" : "opacity-100 duration-150 delay-150";

  return (
    <aside
      className="fixed inset-y-0 left-0 z-20 hidden flex-col overflow-hidden border-r border-sidebar-border bg-sidebar-bg bg-gradient-to-b from-sidebar-bg-2 via-sidebar-bg to-sidebar-bg shadow-[4px_0_24px_-8px_rgba(0,0,0,0.35)] transition-[width] duration-200 ease-in-out lg:flex"
      style={{ width: collapsed ? "4.5rem" : "15.5rem" }}
    >
      <div
        className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full bg-sidebar-accent/20 blur-3xl"
        aria-hidden
      />

      <div className="relative m-3 mb-2 flex items-center gap-2.5 rounded-xl bg-sidebar-bg-2/80 px-3.5 py-3.5 shadow-[0_4px_16px_-6px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.04)]">
        <button
          type="button"
          onClick={onToggle}
          title={collapsed ? tc("expandSidebar") : tc("collapseSidebar")}
          aria-label={collapsed ? tc("expandSidebar") : tc("collapseSidebar")}
          className="absolute -right-3.5 top-1/2 z-30 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-sidebar-accent to-accent text-white shadow-[0_2px_10px_-1px_rgba(76,95,238,0.55)] ring-[3px] ring-bg transition-all duration-200 hover:scale-110 hover:shadow-[0_4px_14px_-2px_rgba(76,95,238,0.7)]"
        >
          <IconChevronsLeft
            size={15}
            stroke={2.5}
            className={`transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
          />
        </button>
        {brandLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brandLogoUrl}
            alt={brandName ?? "Logo"}
            className="h-9 w-9 shrink-0 rounded-lg border border-sidebar-border bg-white/95 object-contain p-1 shadow-soft"
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sidebar-accent to-accent text-sm font-bold text-white shadow-[0_2px_10px_-1px_rgba(141,151,255,0.6),inset_0_1px_0_rgba(255,255,255,0.3)]">
            {(brandName ?? "KPI Platform").charAt(0).toUpperCase()}
          </div>
        )}
        <span
          className={`min-w-0 flex-1 truncate whitespace-nowrap text-[15px] font-semibold tracking-tight text-sidebar-text-active transition-opacity ${labelClass}`}
        >
          {brandName ?? "KPI Platform"}
        </span>
      </div>

      <nav className="relative flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden px-3 py-2">
        {groups.map(({ group, items }) => (
          <div key={group} className="flex flex-col gap-0.5">
            {group !== "main" && (
              <span
                className={`px-3 pb-1.5 pt-2 text-[11px] font-medium uppercase tracking-wide text-sidebar-text/60 transition-opacity ${labelClass}`}
              >
                {t(`groups.${group}`)}
              </span>
            )}
            {items.map(({ key, href, icon: Icon }) => {
              const active = isNavItemActive(pathname, href);
              const badge = navBadges[key];
              const isAttention = ATTENTION_BADGE_KEYS.has(key);
              return (
                <Link
                  key={key}
                  href={href}
                  title={collapsed ? `${t(key)}${badge ? ` (${badge})` : ""}` : undefined}
                  className={[
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                    active
                      ? "bg-sidebar-active text-sidebar-text-active"
                      : "text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active",
                    collapsed ? "justify-center" : "",
                  ].join(" ")}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-sidebar-accent shadow-[0_0_10px_var(--sidebar-accent)]" />
                  )}
                  <span className="relative shrink-0">
                    <Icon size={20} stroke={1.75} className={active ? "text-sidebar-accent" : ""} />
                    {!!badge && collapsed && isAttention && (
                      <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold leading-none text-white ring-2 ring-sidebar-bg">
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </span>
                  <span className={`min-w-0 flex-1 truncate whitespace-nowrap transition-opacity ${labelClass}`}>
                    {t(key)}
                  </span>
                  {!!badge && !collapsed && (
                    <span
                      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none tabular-nums transition-opacity ${labelClass} ${
                        isAttention
                          ? active
                            ? "bg-danger text-white"
                            : "bg-danger/20 text-[#ff9d95]"
                          : "bg-white/10 text-sidebar-text"
                      }`}
                    >
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
