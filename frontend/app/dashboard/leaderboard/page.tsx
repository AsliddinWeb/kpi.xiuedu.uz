import { IconTrophyOff } from "@tabler/icons-react";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import LeaderboardTable from "@/components/leaderboard/LeaderboardTable";
import { getMe } from "@/lib/auth";
import { getLeaderboard } from "@/lib/dashboard";
import { getKpiTemplates } from "@/lib/kpiTemplates";

export default async function LeaderboardPage() {
  const locale = await getLocale();
  const user = await getMe(locale);
  if (!user) redirect("/login");

  const templates = await getKpiTemplates(locale);
  const t = await getTranslations("leaderboard");

  if (templates.length === 0) {
    return (
      <div>
        <h1 className="mb-6 text-xl font-semibold text-text-1">{t("heading")}</h1>
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <IconTrophyOff size={32} stroke={1.5} className="text-text-3" />
          <p className="text-sm font-semibold text-text-1">{t("noTemplates")}</p>
        </div>
      </div>
    );
  }

  const defaultTemplate =
    templates.find((tpl) => tpl.id === user.kpi_template_id && tpl.is_active) ??
    templates.find((tpl) => tpl.id === user.kpi_template_id) ??
    templates.find((tpl) => tpl.is_active) ??
    templates[0];

  const defaultPeriod = defaultTemplate.academic_year;
  const initialRows = await getLeaderboard(locale, defaultTemplate.id, defaultPeriod);

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-text-1">{t("heading")}</h1>
      <LeaderboardTable
        templates={templates}
        initialTemplateId={defaultTemplate.id}
        initialPeriod={defaultPeriod}
        initialRows={initialRows}
        currentUserId={user.id}
      />
    </div>
  );
}
