"use client";

import { IconCornerDownLeft, IconSearch } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { visibleNavItems } from "./nav-items";

export default function TopSearch({ role }: { role: string }) {
  const t = useTranslations("topbar");
  const navT = useTranslations("nav");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo(() => visibleNavItems(role), [role]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => navT(item.key).toLowerCase().includes(q));
  }, [items, navT, query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleShortcut);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleShortcut);
    };
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = results[activeIndex];
      if (target) go(target.href);
    } else if (event.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  return (
    <div className="relative max-w-sm flex-1" ref={containerRef}>
      <div className="flex items-center gap-2 rounded-full border border-border bg-bg px-4 py-2 text-sm text-text-2 transition-colors focus-within:border-accent">
        <IconSearch size={16} stroke={2} className="shrink-0 text-text-3" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={t("search")}
          className="w-full bg-transparent text-text-1 placeholder:text-text-3 focus:outline-none"
        />
        <kbd className="hidden shrink-0 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-text-3 sm:block">
          ⌘K
        </kbd>
      </div>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-30 mt-2 w-full overflow-hidden rounded-xl border border-border bg-surface py-1.5 shadow-lg"
        >
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-text-3">{t("noResults")}</p>
          ) : (
            results.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => go(item.href)}
                  className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition-colors ${
                    index === activeIndex ? "bg-accent-soft text-accent" : "text-text-2 hover:bg-surface-alt"
                  }`}
                >
                  <Icon size={16} stroke={2} className="shrink-0" />
                  {navT(item.key)}
                  {index === activeIndex && <IconCornerDownLeft size={13} stroke={2} className="ml-auto shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
