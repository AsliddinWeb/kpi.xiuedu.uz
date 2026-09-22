"use client";

import { IconBell, IconBellRinging } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

export default function NotificationsMenu() {
  const t = useTranslations("topbar");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("notifications")}
        className="flex h-9 w-9 items-center justify-center rounded-full text-text-2 transition-colors hover:bg-surface-alt hover:text-text-1"
      >
        {open ? <IconBellRinging size={20} stroke={2} /> : <IconBell size={20} stroke={2} />}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-text-1">{t("notifications")}</p>
          </div>
          <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-alt text-text-3">
              <IconBell size={18} stroke={2} />
            </div>
            <p className="text-sm text-text-2">{t("noNotifications")}</p>
            <p className="text-xs text-text-3">{t("noNotificationsHint")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
