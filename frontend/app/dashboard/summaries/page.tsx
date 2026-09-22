import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import SummariesWorkspace from "@/components/summaries/SummariesWorkspace";
import { REPORTS_VIEWERS } from "@/components/dashboard/nav-items";
import { getMe } from "@/lib/auth";
import { getKpiTemplates } from "@/lib/kpiTemplates";
import { getSummaries } from "@/lib/summaries";

export default async function SummariesPage() {
  const locale = await getLocale();
  const user = await getMe(locale);
  if (!user) redirect("/login");
  if (!REPORTS_VIEWERS(user.role)) redirect("/dashboard");

  const [summaries, templates] = await Promise.all([getSummaries(locale), getKpiTemplates(locale)]);
  const academicYears = Array.from(new Set(templates.map((tpl) => tpl.academic_year))).sort().reverse();
  const t = await getTranslations("summaries");

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-text-1">{t("heading")}</h1>
      <SummariesWorkspace initialSummaries={summaries} academicYears={academicYears} />
    </div>
  );
}
