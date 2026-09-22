import { getTranslations } from "next-intl/server";
import { getMyKpi } from "@/lib/dashboard";

export default async function CategoryBreakdownCard({ locale, period }: { locale: string; period: string }) {
  const t = await getTranslations("dashboard");
  const rows = await getMyKpi(locale, period);

  const byCategory = new Map<string, { awarded: number; max: number }>();
  for (const row of rows) {
    const entry = byCategory.get(row.category_name) ?? { awarded: 0, max: 0 };
    entry.awarded += row.awarded_total;
    entry.max += row.max_score;
    byCategory.set(row.category_name, entry);
  }
  const categories = Array.from(byCategory.entries());

  return (
    <div className="relative animate-fade-up overflow-hidden rounded-xl border border-border bg-gradient-to-br from-accent-soft/30 via-surface to-surface p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-accent via-accent/60 to-transparent" aria-hidden />
      <p className="relative mb-4 text-sm font-semibold text-text-1">{t("categoryBreakdown")}</p>
      {categories.length === 0 ? (
        <p className="relative text-sm text-text-3">{t("noEvaluationsYet")}</p>
      ) : (
        <div className="relative space-y-3.5">
          {categories.map(([name, { awarded, max }]) => (
            <div key={name}>
              <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-text-2">{name}</span>
                <span className="shrink-0 font-semibold text-text-1 tabular-nums">
                  {Math.round(awarded * 10) / 10} / {max}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-alt">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out"
                  style={{ width: `${max > 0 ? (awarded / max) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
