import {
  IconBuildingSkyscraper,
  IconChartBar,
  IconClipboardList,
  IconFileCheck,
  IconFlag3,
  IconGauge,
  IconHistory,
  IconLayoutDashboard,
  IconReportAnalytics,
  IconScale,
  IconSettings,
  IconTrophy,
  IconUsers,
  type Icon,
} from "@tabler/icons-react";

export const ADMIN_ONLY = (role: string) => role === "super_admin" || role === "admin";
export const MANAGER_UP = (role: string) => role === "super_admin" || role === "admin" || role === "manager";

export const RECTOR_ROLES = ["rector", "prorektor_birinchi", "prorektor_oquv", "prorektor_xalqaro"];
export const RECTOR_UP = (role: string) => RECTOR_ROLES.includes(role);
export const EMPLOYEES_VIEWERS = (role: string) => ADMIN_ONLY(role) || RECTOR_UP(role);
export const REPORTS_VIEWERS = (role: string) => ADMIN_ONLY(role) || RECTOR_UP(role);

export type NavGroup = "main" | "kpi" | "admin";

export type NavItem = {
  key: string;
  href: string;
  icon: Icon;
  group: NavGroup;
  enabled: (role: string) => boolean;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { key: "dashboard", href: "/dashboard", icon: IconLayoutDashboard, group: "main", enabled: () => true },
  { key: "templates", href: "/dashboard/templates", icon: IconClipboardList, group: "kpi", enabled: ADMIN_ONLY },
  { key: "arizalar", href: "/dashboard/arizalar", icon: IconFileCheck, group: "kpi", enabled: MANAGER_UP },
  { key: "myKpi", href: "/dashboard/my-kpi", icon: IconGauge, group: "kpi", enabled: () => true },
  { key: "workPlan", href: "/dashboard/work-plan", icon: IconFlag3, group: "kpi", enabled: () => true },
  { key: "leaderboard", href: "/dashboard/leaderboard", icon: IconTrophy, group: "kpi", enabled: () => true },
  { key: "structure", href: "/dashboard/structure", icon: IconBuildingSkyscraper, group: "admin", enabled: ADMIN_ONLY },
  { key: "employees", href: "/dashboard/employees", icon: IconUsers, group: "admin", enabled: EMPLOYEES_VIEWERS },
  { key: "governance", href: "/dashboard/governance", icon: IconScale, group: "admin", enabled: REPORTS_VIEWERS },
  { key: "reports", href: "/dashboard/reports", icon: IconChartBar, group: "admin", enabled: REPORTS_VIEWERS },
  { key: "summaries", href: "/dashboard/summaries", icon: IconReportAnalytics, group: "admin", enabled: REPORTS_VIEWERS },
  { key: "auditLog", href: "/dashboard/audit-log", icon: IconHistory, group: "admin", enabled: ADMIN_ONLY },
  { key: "settings", href: "/dashboard/settings", icon: IconSettings, group: "admin", enabled: ADMIN_ONLY },
] as const;

export const NAV_GROUP_ORDER: readonly NavGroup[] = ["main", "kpi", "admin"];

export function visibleNavItems(role: string): NavItem[] {
  return NAV_ITEMS.filter((item) => item.enabled(role));
}

export const ATTENTION_BADGE_KEYS = new Set(["arizalar", "governance"]);

export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
}

export function groupedNavItems(role: string): { group: NavGroup; items: NavItem[] }[] {
  const visible = visibleNavItems(role);
  return NAV_GROUP_ORDER.map((group) => ({ group, items: visible.filter((item) => item.group === group) })).filter(
    (g) => g.items.length > 0,
  );
}
