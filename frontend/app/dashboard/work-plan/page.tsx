import { IconClipboardOff } from "@tabler/icons-react";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import WorkPlanWorkspace from "@/components/work-plan/WorkPlanWorkspace";
import { getMe } from "@/lib/auth";
import { getKpiTemplate } from "@/lib/kpiTemplates";
import { getWorkPlans } from "@/lib/workPlans";

export default async function WorkPlanPage() {
  const locale = await getLocale();
  const user = await getMe(locale);
  if (!user) redirect("/login");

  const t = await getTranslations("workPlan");

  if (user.kpi_template_id == null) {
    return (
      <div>
        <h1 className="mb-6 text-xl font-semibold text-text-1">{t("heading")}</h1>
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <IconClipboardOff size={32} stroke={1.5} className="text-text-3" />
          <p className="text-sm font-semibold text-text-1">{t("noTemplateAssigned")}</p>
        </div>
      </div>
    );
  }

  const template = await getKpiTemplate(locale, user.kpi_template_id);
  const plans = await getWorkPlans(locale, user.id);

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-text-1">{t("heading")}</h1>
      <WorkPlanWorkspace template={template} initialPlans={plans} defaultPeriod={template?.academic_year ?? ""} />
    </div>
  );
}
