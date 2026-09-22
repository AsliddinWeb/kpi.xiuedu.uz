import { IconCalendar, IconCircleCheck, IconFileOff, IconFlag3, IconGauge, IconTrophy } from "@tabler/icons-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import CategoryBreakdownCard from "@/components/dashboard/CategoryBreakdownCard";
import QuickActions from "@/components/dashboard/QuickActions";
import ScoreDonutCard from "@/components/dashboard/ScoreDonutCard";
import StatCard from "@/components/dashboard/StatCard";
import TrendCard from "@/components/dashboard/TrendCard";
import type { KpiResult } from "@/lib/kpiResults";

export default async function EmployeeDashboard({ results }: { results: KpiResult[] }) {
  const locale = await getLocale();
  const t = await getTranslations("dashboard");
  const resultT = await getTranslations("kpiResults");
  const navT = await getTranslations("nav");
  const statusT = await getTranslations("kpiResults.statusValues");

  const sorted = [...results].sort((a, b) => a.period.localeCompare(b.period));
  const latest = sorted[sorted.length - 1] ?? null;
  const previous = sorted[sorted.length - 2] ?? null;
  const approvedCount = results.filter((r) => r.status === "approved").length;
  const trendData = sorted.map((r) => ({ label: r.period, value: r.total_score }));

  const scoreTrend =
    latest && previous ? Math.round((latest.total_score - previous.total_score) * 10) / 10 : null;

  return (
    <div className="space-y-6">
      {results.length > 0 ? (
        <>
          <div className="stagger-fade grid gap-4 sm:grid-cols-3">
            <StatCard
              title={resultT("totalScore")}
              value={latest ? `${latest.total_score}` : "—"}
              hint={latest?.period}
              icon={IconGauge}
              trend={scoreTrend != null ? { value: scoreTrend } : undefined}
              href="/dashboard/my-kpi"
            />
            <StatCard
              title={t("periodsCount")}
              value={String(results.length)}
              icon={IconCalendar}
              tone="warning"
              href="/dashboard/my-kpi"
            />
            <StatCard
              title={t("approvedCount")}
              value={String(approvedCount)}
              icon={IconCircleCheck}
              tone="success"
              href="/dashboard/leaderboard"
            />
          </div>

          <div className="stagger-fade grid gap-4 lg:grid-cols-2">
            <ScoreDonutCard
              title={resultT("totalScore")}
              percent={latest?.total_score ?? 0}
              label={latest?.period ?? undefined}
            />
            {trendData.length > 1 && <TrendCard title={t("scoreTrend")} data={trendData} />}
          </div>

          {latest && <CategoryBreakdownCard locale={locale} period={latest.period} />}

          <QuickActions
            title={t("quickActions")}
            actions={[
              { key: "myKpi", label: navT("myKpi"), href: "/dashboard/my-kpi", icon: IconGauge },
              { key: "workPlan", label: navT("workPlan"), href: "/dashboard/work-plan", icon: IconFlag3 },
              { key: "leaderboard", label: navT("leaderboard"), href: "/dashboard/leaderboard", icon: IconTrophy },
            ]}
          />

          <div className="rounded-xl border border-border bg-surface shadow-soft">
            <h2 className="border-b border-border px-4 py-3 text-sm font-semibold text-text-1">{t("myResults")}</h2>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-text-3">
                <tr>
                  <th className="px-4 py-3 font-medium">{resultT("period")}</th>
                  <th className="px-4 py-3 font-medium">{resultT("status")}</th>
                  <th className="px-4 py-3 font-medium">{resultT("totalScore")}</th>
                </tr>
              </thead>
              <tbody>
                {sorted
                  .slice()
                  .reverse()
                  .map((result) => {
                    const colorClass =
                      result.status === "approved" ? "bg-success-soft text-success" : "bg-warning-soft text-warning";
                    return (
                      <tr
                        key={result.id}
                        className="border-b border-border transition-colors last:border-0 hover:bg-surface-alt"
                      >
                        <td className="px-4 py-3 text-text-1">{result.period}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${colorClass}`}>
                            {statusT(result.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-2">{result.total_score}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface px-6 py-16 text-center shadow-soft">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-alt text-text-3">
            <IconFileOff size={22} stroke={1.5} />
          </div>
          <p className="text-sm font-medium text-text-1">{t("noEvaluationsYet")}</p>
          <Link href="/dashboard/my-kpi" className="text-sm font-medium text-accent hover:underline">
            {t("goToMyKpi")}
          </Link>
        </div>
      )}
    </div>
  );
}
