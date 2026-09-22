import type { IconGift } from "@tabler/icons-react";

export default function StatChip({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof IconGift;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-current/10 ${tone}`}>
        <Icon size={18} stroke={1.75} />
      </div>
      <div>
        <p className="text-lg font-bold leading-none text-text-1 tabular-nums">{value}</p>
        <p className="text-xs text-text-3">{label}</p>
      </div>
    </div>
  );
}
