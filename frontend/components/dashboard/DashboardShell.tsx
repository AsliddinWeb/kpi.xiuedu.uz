"use client";

import { useState } from "react";
import MobileTabBar from "./MobileTabBar";
import Sidebar from "./Sidebar";

export default function DashboardShell({
  role,
  initialCollapsed,
  brandName,
  brandLogoUrl,
  navBadges,
  children,
}: {
  role: string;
  initialCollapsed: boolean;
  brandName: string | null;
  brandLogoUrl: string | null;
  navBadges: Record<string, number>;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  async function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      await fetch("/api/v1/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sidebar_collapsed: next }),
      });
    } catch {
      // best-effort persistence -- UI already reflects the new state
    }
  }

  return (
    <div className="min-h-screen">
      <Sidebar
        role={role}
        collapsed={collapsed}
        onToggle={toggle}
        brandName={brandName}
        brandLogoUrl={brandLogoUrl}
        navBadges={navBadges}
      />
      <div
        className="relative min-h-screen pb-16 transition-[padding-left] duration-200 ease-in-out lg:pb-0 lg:pl-[var(--sidebar-w)]"
        style={{ "--sidebar-w": collapsed ? "4.5rem" : "15.5rem" } as React.CSSProperties}
      >
        <div
          className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(60%_100%_at_50%_0%,var(--accent-soft),transparent)] opacity-70"
          aria-hidden
        />
        {children}
      </div>
      <MobileTabBar role={role} navBadges={navBadges} />
    </div>
  );
}
