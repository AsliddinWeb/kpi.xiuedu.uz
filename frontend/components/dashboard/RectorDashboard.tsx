import {
  IconArrowRight,
  IconChartBar,
  IconClockHour4,
  IconGauge,
  IconReportAnalytics,
  IconScale,
  IconUsers,
} from "@tabler/icons-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import BreakdownDonutCard from "@/components/dashboard/BreakdownDonutCard";
import DepartmentRanking from "@/components/dashboard/DepartmentRanking";
import QuickActions from "@/components/dashboard/QuickActions";
import ScoreDonutCard from "@/components/dashboard/ScoreDonutCard";
import StatCard from "@/components/dashboard/StatCard";
import type { RectorSummary } from "@/lib/dashboard";

export default async function RectorDashboard({
  locale,
  summary,
}: {
  locale: string;
  summary: RectorSummary | null;
}) {
  const t = await getTranslations("dashboard");
  const navT = await getTranslations("nav");
  const governanceT = await getTranslations("governance");

  const governanceTotal = (summary?.active_correction_plans ?? 0) + (summary?.active_force_majeure ?? 0);

  return (
    <div className="space-y-6">
      {summary && (
        <div className="stagger-fade grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={t("totalEmployees")}
            value={String(summary.total_employees)}
            icon={IconUsers}
            href="/dashboard/employees"
          />
          <StatCard
            title={t("orgAverageScore")}
            value={summary.organization_average_score != null ? `${summary.organization_average_score}` : "—"}
            icon={IconGauge}
            tone="success"
            href="/dashboard/reports"
          />
          <StatCard
            title={t("pendingHeadApprovals")}
            value={String(summary.pending_head_approvals)}
            icon={IconClockHour4}
            tone={summary.pending_head_approvals > 0 ? "warning" : "success"}
            href="/dashboard/arizalar"
          />
          <StatCard
            title={t("activeGovernanceIssues")}
            value={String(governanceTotal)}
            icon={IconScale}
            tone={governanceTotal > 0 ? "danger" : "success"}
            href="/dashboard/governance"
          />
        </div>
      )}

      {summary && (
        <div className="stagger-fade grid gap-4 lg:grid-cols-2">
          <ScoreDonutCard title={t("orgAverageScore")} percent={summary.organization_average_score ?? 0} />
          <BreakdownDonutCard
            title={t("activeGovernanceIssues")}
            segments={[
              { label: governanceT("tabs.correctionPlans"), value: summary.active_correction_plans, colorVar: "var(--warning)" },
              { label: governanceT("tabs.forceMajeure"), value: summary.active_force_majeure, colorVar: "var(--danger)" },
            ]}
          />
        </div>
      )}

      <div className="stagger-fade grid gap-4 lg:grid-cols-2">
        <DepartmentRanking locale={locale} />
        <Link
          href="/dashboard/arizalar"
          className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-surface p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg"
        >
          <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-warning via-warning/60 to-transparent" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-text-1">{t("pendingHeadApprovals")}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-text-1">
              {summary?.pending_head_approvals ?? 0}
            </p>
            <p className="mt-1 text-xs text-text-3">{t("pendingHeadApprovalsHint")}</p>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs font-semibold text-accent">
            {t("viewArizalar")}
            <IconArrowRight
              size={16}
              stroke={2}
              className="transition-transform group-hover:translate-x-1"
            />
          </div>
        </Link>
      </div>

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

      <QuickActions
        title={t("quickActions")}
        actions={[
          { key: "employees", label: navT("employees"), href: "/dashboard/employees", icon: IconUsers },
          { key: "governance", label: navT("governance"), href: "/dashboard/governance", icon: IconScale },
          { key: "reports", label: navT("reports"), href: "/dashboard/reports", icon: IconChartBar },
          { key: "summaries", label: navT("summaries"), href: "/dashboard/summaries", icon: IconReportAnalytics },
        ]}
      />
    </div>
  );
}
