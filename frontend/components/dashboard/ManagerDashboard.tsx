import { IconClockHour4, IconFlag3, IconGauge, IconTrophy, IconUsersGroup } from "@tabler/icons-react";
import { getLocale, getTranslations } from "next-intl/server";
import PendingReviewCard from "@/components/dashboard/PendingReviewCard";
import QuickActions from "@/components/dashboard/QuickActions";
import RankingBarChart from "@/components/dashboard/RankingBarChart";
import ScoreDonutCard from "@/components/dashboard/ScoreDonutCard";
import StatCard from "@/components/dashboard/StatCard";
import type { TeamMember } from "@/lib/dashboard";

export default async function ManagerDashboard({ team }: { team: TeamMember[] }) {
  const locale = await getLocale();
  const t = await getTranslations("dashboard");
  const resultT = await getTranslations("kpiResults");
  const roleT = await getTranslations("roles");
  const navT = await getTranslations("nav");
  const statusT = await getTranslations("kpiResults.statusValues");

  const pendingCount = team.filter((m) => !m.latest_status).length;
  const scored = team.filter((m) => m.latest_score != null);
  const avgScore = scored.length
    ? Math.round((scored.reduce((sum, m) => sum + (m.latest_score as number), 0) / scored.length) * 10) / 10
    : null;

  const topMembers = [...scored]
    .sort((a, b) => (b.latest_score ?? 0) - (a.latest_score ?? 0))
    .slice(0, 6)
    .map((m) => ({ name: m.full_name, value: m.latest_score ?? 0, hasData: true }));

  return (
    <div className="space-y-6">
      <div className="stagger-fade grid gap-4 sm:grid-cols-3">
        <StatCard title={t("teamSize")} value={String(team.length)} icon={IconUsersGroup} />
        <StatCard
          title={t("pendingEvaluations")}
          value={String(pendingCount)}
          icon={IconClockHour4}
          tone="warning"
          href="/dashboard/arizalar"
        />
        <StatCard
          title={t("teamAverageScore")}
          value={avgScore != null ? `${avgScore}` : "—"}
          icon={IconGauge}
          tone="success"
          href="/dashboard/leaderboard"
        />
      </div>

      <PendingReviewCard locale={locale} />

      <QuickActions
        title={t("quickActions")}
        actions={[
          { key: "arizalar", label: navT("arizalar"), href: "/dashboard/arizalar", icon: IconClockHour4 },
          { key: "leaderboard", label: navT("leaderboard"), href: "/dashboard/leaderboard", icon: IconTrophy },
          { key: "workPlan", label: navT("workPlan"), href: "/dashboard/work-plan", icon: IconFlag3 },
        ]}
      />

      {scored.length > 0 && (
        <div className="stagger-fade grid gap-4 lg:grid-cols-2">
          <ScoreDonutCard title={t("teamAverageScore")} percent={avgScore ?? 0} label={t("scoredCountLabel", { count: scored.length })} />
          <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-5 shadow-soft">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-accent via-accent/60 to-transparent" aria-hidden />
            <p className="mb-4 text-sm font-semibold text-text-1">{t("topPerformers")}</p>
            <RankingBarChart rows={topMembers} />
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-soft">
        <h2 className="border-b border-border px-4 py-3 text-sm font-semibold text-text-1">{t("myTeam")}</h2>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-text-3">
            <tr>
              <th className="px-4 py-3 font-medium">{resultT("employee")}</th>
              <th className="px-4 py-3 font-medium">{t("role")}</th>
              <th className="px-4 py-3 font-medium">{resultT("period")}</th>
              <th className="px-4 py-3 font-medium">{resultT("status")}</th>
              <th className="px-4 py-3 font-medium">{resultT("totalScore")}</th>
            </tr>
          </thead>
          <tbody>
            {team.map((member) => {
              const colorClass =
                member.latest_status === "approved"
                  ? "bg-success-soft text-success"
                  : member.latest_status === "computed"
                    ? "bg-warning-soft text-warning"
                    : "bg-surface-alt text-text-2";
              return (
                <tr key={member.user_id} className="border-b border-border transition-colors last:border-0 hover:bg-surface-alt">
                  <td className="px-4 py-3 text-text-1">{member.full_name}</td>
                  <td className="px-4 py-3 text-text-2">{roleT(member.role)}</td>
                  <td className="px-4 py-3 text-text-2">{member.latest_period ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${colorClass}`}>
                      {member.latest_status ? statusT(member.latest_status) : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-2">{member.latest_score ?? "—"}</td>
                </tr>
              );
            })}
            {team.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-text-3">
                  {t("noTeamMembers")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
