import { getTranslations } from "next-intl/server";
import { getAuditLog } from "@/lib/audit";

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31536000],
  ["month", 2592000],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

function timeAgo(iso: string, locale: string): string {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [unit, secondsInUnit] of UNITS) {
    const value = Math.floor(seconds / secondsInUnit);
    if (Math.abs(value) >= 1) return rtf.format(-value, unit);
  }
  return rtf.format(0, "second");
}

export default async function RecentActivity({ locale }: { locale: string }) {
  const t = await getTranslations("auditLog");
  const dashT = await getTranslations("dashboard");
  const { items } = await getAuditLog(locale, 6, 0);

  return (
    <div className="relative animate-fade-up overflow-hidden rounded-xl border border-border bg-gradient-to-br from-accent-soft/40 via-surface to-surface p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-accent via-accent/60 to-transparent" aria-hidden />
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent-soft/50 blur-3xl" aria-hidden />
      <p className="relative mb-4 flex items-center gap-2 text-sm font-semibold text-text-1">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        {dashT("recentActivity")}
      </p>
      {items.length === 0 ? (
        <p className="relative text-sm text-text-3">{t("noEntries")}</p>
      ) : (
        <div className="relative space-y-4">
          {items.map((entry, i) => (
            <div key={entry.id} className="relative flex gap-3">
              <div className="flex flex-col items-center">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                {i < items.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <p className="text-sm leading-snug text-text-1">
                  <span className="font-medium">{entry.user_full_name ?? t("systemUser")}</span>{" "}
                  <span className="text-text-2">{t(`actions.${entry.action}`).toLowerCase()}</span>{" "}
                  <span className="text-text-2">{t(`entities.${entry.entity}`).toLowerCase()}</span>
                </p>
                <p className="text-xs text-text-3">{timeAgo(entry.created_at, locale)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
