import { getTranslations } from "next-intl/server";
import RankingBarChart from "@/components/dashboard/RankingBarChart";
import { getDepartmentComparison } from "@/lib/dashboard";

export default async function DepartmentRanking({ locale }: { locale: string }) {
  const t = await getTranslations("dashboard");
  const reportsT = await getTranslations("reports");
  const rows = await getDepartmentComparison(locale);
  const ranked = rows
    .filter((r) => r.average_score != null)
    .sort((a, b) => (b.average_score ?? 0) - (a.average_score ?? 0))
    .slice(0, 6);

  const chartRows = ranked.map((r) => ({ name: r.department_name, value: r.average_score ?? 0, hasData: true }));

  return (
    <div className="relative animate-fade-up overflow-hidden rounded-xl border border-border bg-gradient-to-br from-success-soft/40 via-surface to-surface p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-success via-success/60 to-transparent" aria-hidden />
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-success-soft/50 blur-3xl" aria-hidden />
      <p className="relative mb-4 text-sm font-semibold text-text-1">{t("departmentRanking")}</p>
      <div className="relative">
        {ranked.length === 0 ? (
          <p className="text-sm text-text-3">{reportsT("noDepartments")}</p>
        ) : (
          <RankingBarChart rows={chartRows} />
        )}
      </div>
    </div>
  );
}
