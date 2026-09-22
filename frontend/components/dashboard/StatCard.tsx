import { IconArrowUpRight, IconTrendingDown, IconTrendingUp, type Icon } from "@tabler/icons-react";
import Link from "next/link";

type Tone = "accent" | "success" | "warning" | "danger";

const TONE_ICON_CLASSES: Record<Tone, string> = {
  accent: "bg-gradient-to-br from-accent to-[#3646c9] text-white shadow-[0_4px_10px_-2px_rgba(76,95,238,0.45)]",
  success: "bg-gradient-to-br from-success to-[#0f7a37] text-white shadow-[0_4px_10px_-2px_rgba(22,163,74,0.4)]",
  warning: "bg-gradient-to-br from-warning to-[#b17e00] text-white shadow-[0_4px_10px_-2px_rgba(224,161,0,0.4)]",
  danger: "bg-gradient-to-br from-danger to-[#b8291f] text-white shadow-[0_4px_10px_-2px_rgba(228,72,60,0.4)]",
};

const TONE_BAR_CLASSES: Record<Tone, string> = {
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

const TONE_GLOW_CLASSES: Record<Tone, string> = {
  accent: "bg-accent/15",
  success: "bg-success/15",
  warning: "bg-warning/15",
  danger: "bg-danger/15",
};

const TONE_WASH_CLASSES: Record<Tone, string> = {
  accent: "from-accent-soft/60",
  success: "from-success-soft/60",
  warning: "from-warning-soft/60",
  danger: "from-danger-soft/60",
};

type Props = {
  title: string;
  value: string;
  hint?: string;
  icon?: Icon;
  tone?: Tone;
  trend?: { value: number; positiveIsGood?: boolean };
  href?: string;
};

export default function StatCard({ title, value, hint, icon: Icon, tone = "accent", trend, href }: Props) {
  const trendUp = trend != null && trend.value >= 0;
  const trendGood = trend != null && (trend.positiveIsGood ?? true) === trendUp;

  const content = (
    <>
      <span
        className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${TONE_WASH_CLASSES[tone]} to-transparent opacity-60`}
        aria-hidden
      />
      <span
        className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl transition-opacity duration-300 ${TONE_GLOW_CLASSES[tone]} opacity-40 group-hover:opacity-100`}
        aria-hidden
      />
      <span className={`absolute inset-x-0 top-0 h-[3px] ${TONE_BAR_CLASSES[tone]}`} aria-hidden />
      <div className="relative flex items-center justify-between">
        <p className="text-xs font-medium text-text-2">{title}</p>
        {Icon && (
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105 ${TONE_ICON_CLASSES[tone]}`}
          >
            <Icon size={17} stroke={1.75} />
          </div>
        )}
      </div>
      <div className="relative mt-3 flex items-baseline gap-2">
        <p className="text-2xl font-bold tracking-tight text-text-1 tabular-nums">{value}</p>
        {trend && (
          <span
            className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
              trendGood ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
            }`}
          >
            {trendUp ? <IconTrendingUp size={12} stroke={2.25} /> : <IconTrendingDown size={12} stroke={2.25} />}
            {Math.abs(trend.value)}
          </span>
        )}
      </div>
      <div className="relative mt-1 flex items-center justify-between gap-2">
        {hint && <p className="truncate text-xs text-text-3">{hint}</p>}
        {href && (
          <IconArrowUpRight
            size={14}
            stroke={2.25}
            className="ml-auto shrink-0 text-text-3 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent"
          />
        )}
      </div>
    </>
  );

  const className =
    "group relative block animate-fade-up overflow-hidden rounded-xl border border-border bg-surface p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg" +
    (href ? " hover:border-accent/40" : "");

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
