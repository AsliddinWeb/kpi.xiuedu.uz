"use client";

import { IconChevronDown, IconLogout, IconSettings, IconUserCircle } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ADMIN_ONLY } from "./nav-items";

type TopbarUser = {
  full_name: string;
  email: string;
  role: string;
};

export default function ProfileMenu({ user }: { user: TopbarUser }) {
  const t = useTranslations("topbar");
  const roleT = useTranslations("roles");
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/v1/auth/logout", { method: "POST", credentials: "include" });
    } finally {
      window.location.href = "/login";
    }
  }

  const initial = user.full_name.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-full border border-transparent py-1 pl-1 pr-2.5 transition-colors hover:border-border hover:bg-surface-alt"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-[#3646c9] text-xs font-semibold text-white shadow-[0_2px_6px_-1px_rgba(76,95,238,0.5)]">
          {initial}
        </div>
        <div className="hidden text-left sm:block">
          <p className="text-sm font-semibold leading-tight text-text-1">{user.full_name}</p>
          <p className="text-xs leading-tight text-text-2">{roleT(user.role)}</p>
        </div>
        <IconChevronDown
          size={16}
          stroke={2}
          className={`hidden text-text-3 transition-transform sm:block ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-surface py-1.5 shadow-lg"
        >
          <div className="border-b border-border px-3.5 py-3">
            <p className="truncate text-sm font-semibold text-text-1">{user.full_name}</p>
            <p className="truncate text-xs text-text-3">{user.email}</p>
          </div>

          <div className="py-1">
            <Link
              href="/dashboard/profile"
              onClick={() => setOpen(false)}
              role="menuitem"
              className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-text-2 transition-colors hover:bg-surface-alt hover:text-text-1"
            >
              <IconUserCircle size={17} stroke={2} />
              {t("profile")}
            </Link>
            {ADMIN_ONLY(user.role) && (
              <Link
                href="/dashboard/settings"
                onClick={() => setOpen(false)}
                role="menuitem"
                className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-text-2 transition-colors hover:bg-surface-alt hover:text-text-1"
              >
                <IconSettings size={17} stroke={2} />
                {t("settingsLink")}
              </Link>
            )}
          </div>

          <div className="border-t border-border py-1">
            <button
              type="button"
              role="menuitem"
              disabled={loggingOut}
              onClick={logout}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-danger transition-colors hover:bg-danger-soft disabled:opacity-50"
            >
              <IconLogout size={17} stroke={2} />
              {loggingOut ? t("loggingOut") : t("logout")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
