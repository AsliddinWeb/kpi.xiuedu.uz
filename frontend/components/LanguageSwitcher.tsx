"use client";

import { IconCheck, IconWorld } from "@tabler/icons-react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LOCALE_COOKIE, locales } from "@/i18n/config";

const LABELS: Record<string, string> = {
  uz: "O'zbek",
  ru: "Русский",
  en: "English",
};

const CODES: Record<string, string> = {
  uz: "UZ",
  ru: "RU",
  en: "EN",
};

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
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

  function switchTo(nextLocale: string) {
    document.cookie = `${LOCALE_COOKIE}=${nextLocale}; path=/; max-age=31536000`;
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded px-2 py-1.5 text-sm text-text-2 hover:bg-surface-alt hover:text-text-1"
        aria-label="Change language"
        aria-expanded={open}
      >
        <IconWorld size={18} stroke={2} />
        <span className="text-xs font-medium uppercase">{CODES[locale]}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-36 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-md">
          {locales.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => switchTo(code)}
              className="flex w-full items-center justify-between px-3 py-2 text-sm text-text-1 hover:bg-surface-alt"
            >
              {LABELS[code]}
              {code === locale && <IconCheck size={14} stroke={2} className="text-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
