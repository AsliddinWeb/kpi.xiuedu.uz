import type { ReactNode } from "react";
import type { IconInfoCircle } from "@tabler/icons-react";

export default function FormSection({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof IconInfoCircle;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-6 shadow-soft">
      <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-accent via-accent/60 to-transparent" aria-hidden />
      <div className="mb-5 flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-[#3646c9] text-white shadow-[0_3px_8px_-2px_rgba(76,95,238,0.45)]">
          <Icon size={17} stroke={1.75} />
        </div>
        <h2 className="text-sm font-semibold text-text-1">{title}</h2>
      </div>
      {children}
    </div>
  );
}
