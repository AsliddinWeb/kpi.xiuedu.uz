import type { ReactNode } from "react";
import type { IconMail } from "@tabler/icons-react";

export default function IconField({ icon: Icon, children }: { icon: typeof IconMail; children: ReactNode }) {
  return (
    <div className="group flex items-center gap-2 rounded-xl border border-border bg-bg px-3.5 py-2.5 transition-all focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft">
      <Icon size={16} stroke={1.75} className="shrink-0 text-text-3 transition-colors group-focus-within:text-accent" />
      {children}
    </div>
  );
}
