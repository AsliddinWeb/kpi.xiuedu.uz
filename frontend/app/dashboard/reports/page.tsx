import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import ReportsWorkspace from "@/components/reports/ReportsWorkspace";
import { REPORTS_VIEWERS } from "@/components/dashboard/nav-items";
import { getMe } from "@/lib/auth";
import { getDepartmentComparison } from "@/lib/dashboard";
import { getExports } from "@/lib/exports";
import { getKpiTemplates } from "@/lib/kpiTemplates";

export default async function ReportsPage() {
  const locale = await getLocale();
  const user = await getMe(locale);
  if (!user) redirect("/login");
  if (!REPORTS_VIEWERS(user.role)) redirect("/dashboard");

  const [departments, exportsList, templates] = await Promise.all([
    getDepartmentComparison(locale),
    getExports(locale),
    getKpiTemplates(locale),
  ]);
  const academicYears = Array.from(new Set(templates.map((tpl) => tpl.academic_year))).sort().reverse();
  const t = await getTranslations("reports");

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-text-1">{t("heading")}</h1>
      <ReportsWorkspace
        departments={departments}
        initialExports={exportsList}
        viewerRole={user.role}
        academicYears={academicYears}
      />
    </div>
  );
}
