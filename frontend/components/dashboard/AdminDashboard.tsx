import {
  IconArrowRight,
  IconBriefcase,
  IconBuildingSkyscraper,
  IconClipboardList,
  IconGauge,
  IconScale,
  IconUsers,
} from "@tabler/icons-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import BreakdownDonutCard from "@/components/dashboard/BreakdownDonutCard";
import DepartmentRanking from "@/components/dashboard/DepartmentRanking";
import QuickActions from "@/components/dashboard/QuickActions";
import RecentActivity from "@/components/dashboard/RecentActivity";
import ScoreDonutCard from "@/components/dashboard/ScoreDonutCard";
import StatCard from "@/components/dashboard/StatCard";
import type { OrganizationSummary } from "@/lib/dashboard";

export default async function AdminDashboard({ summary }: { summary: OrganizationSummary | null }) {
  const locale = await getLocale();
  const t = await getTranslations("dashboard");
  const resultT = await getTranslations("kpiResults");
  const navT = await getTranslations("nav");

  const totalResults = summary ? summary.results_computed + summary.results_approved : 0;
  const completionRate = totalResults > 0 ? (summary!.results_approved / totalResults) * 100 : 0;

  return (
    <div className="space-y-6">
      {summary && (
        <>
          <div className="stagger-fade grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title={t("totalEmployees")}
              value={String(summary.total_employees)}
              icon={IconUsers}
              href="/dashboard/employees"
            />
            <StatCard
              title={t("totalDepartments")}
              value={String(summary.total_departments)}
              icon={IconBuildingSkyscraper}
              tone="success"
              href="/dashboard/structure"
            />
            <StatCard
              title={t("totalPositions")}
              value={String(summary.total_positions)}
              icon={IconBriefcase}
              tone="warning"
              href="/dashboard/structure"
            />
            <StatCard
              title={t("orgAverageScore")}
              value={summary.average_score != null ? `${summary.average_score}` : "—"}
              icon={IconGauge}
              tone="danger"
              href="/dashboard/reports"
            />
          </div>

          <div className="stagger-fade grid gap-4 lg:grid-cols-2">
            <ScoreDonutCard title={t("evaluationCompletion")} percent={completionRate} />
            <BreakdownDonutCard
              title={t("evaluationBreakdown")}
              segments={[
                { label: resultT("statusValues.computed"), value: summary.results_computed, colorVar: "var(--warning)" },
                { label: resultT("statusValues.approved"), value: summary.results_approved, colorVar: "var(--success)" },
              ]}
            />
          </div>
        </>
      )}

      <div className="stagger-fade grid gap-4 lg:grid-cols-2">
        <DepartmentRanking locale={locale} />
        <RecentActivity locale={locale} />
      </div>

      <QuickActions
        title={t("quickActions")}
        actions={[
          { key: "employees", label: navT("employees"), href: "/dashboard/employees", icon: IconUsers },
          { key: "templates", label: navT("templates"), href: "/dashboard/templates", icon: IconClipboardList },
          { key: "structure", label: navT("structure"), href: "/dashboard/structure", icon: IconBuildingSkyscraper },
          { key: "governance", label: navT("governance"), href: "/dashboard/governance", icon: IconScale },
        ]}
      />

      <Link
        href="/dashboard/reports"
        className="group relative flex animate-fade-up items-center justify-between overflow-hidden rounded-xl border border-border bg-surface p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg"
      >
        <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-accent via-accent/60 to-transparent" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-text-1">{t("viewReports")}</p>
          <p className="text-xs text-text-3">{t("viewReportsHint")}</p>
        </div>
        <IconArrowRight
          size={18}
          stroke={2}
          className="text-text-3 transition-transform group-hover:translate-x-1 group-hover:text-accent"
        />
      </Link>
    </div>
  );
}
