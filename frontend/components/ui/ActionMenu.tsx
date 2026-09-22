"use client";

import { IconDotsVertical } from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type ActionMenuItem = {
  label: string;
  icon: typeof IconDotsVertical;
  onClick?: () => void;
  href?: string;
  tone?: "default" | "danger";
  disabled?: boolean;
};

export default function ActionMenu({ items, label }: { items: ActionMenuItem[]; label: string }) {
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
    <div className="relative shrink-0" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-text-3 transition-colors hover:bg-surface-alt hover:text-text-1"
      >
        <IconDotsVertical size={16} stroke={1.75} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg"
        >
          {items.map((item) => {
            const Icon = item.icon;
            const toneClass =
              item.tone === "danger" ? "text-danger hover:bg-danger-soft" : "text-text-2 hover:bg-surface-alt hover:text-text-1";
            const className = `flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm font-medium transition-colors disabled:opacity-50 ${toneClass}`;
            if (item.href) {
              return (
                <Link key={item.label} href={item.href} onClick={() => setOpen(false)} className={className}>
                  <Icon size={15} stroke={1.75} />
                  {item.label}
                </Link>
              );
            }
            return (
              <button
                key={item.label}
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onClick?.();
                }}
                className={className}
              >
                <Icon size={15} stroke={1.75} />
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
