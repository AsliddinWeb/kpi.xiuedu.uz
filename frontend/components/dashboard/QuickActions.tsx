import { IconArrowUpRight, type Icon } from "@tabler/icons-react";
import Link from "next/link";

export type QuickAction = {
  key: string;
  label: string;
  hint?: string;
  href: string;
  icon: Icon;
};

export default function QuickActions({ title, actions }: { title: string; actions: QuickAction[] }) {
  if (actions.length === 0) return null;

  return (
    <div className="relative animate-fade-up overflow-hidden rounded-xl border border-border bg-surface p-5 shadow-soft">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-accent via-accent/60 to-transparent" aria-hidden />
      <p className="mb-4 text-sm font-semibold text-text-1">{title}</p>
      <div className="stagger-fade grid gap-2.5 sm:grid-cols-2">
        {actions.map(({ key, label, hint, href, icon: ActionIcon }) => (
          <Link
            key={key}
            href={href}
            className="group flex items-center gap-3 rounded-lg border border-border bg-bg px-3.5 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-soft"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-[#3646c9] text-white shadow-[0_2px_8px_-2px_rgba(76,95,238,0.4)] transition-transform duration-200 group-hover:scale-105">
              <ActionIcon size={17} stroke={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text-1">{label}</p>
              {hint && <p className="truncate text-xs text-text-3">{hint}</p>}
            </div>
            <IconArrowUpRight
              size={14}
              stroke={2.25}
              className="shrink-0 text-text-3 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
