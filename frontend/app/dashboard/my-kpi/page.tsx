import { IconClipboardOff } from "@tabler/icons-react";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import MyKpiWorkspace from "@/components/my-kpi/MyKpiWorkspace";
import { getMe } from "@/lib/auth";
import { getMyKpi } from "@/lib/dashboard";
import { getKpiTemplate } from "@/lib/kpiTemplates";

export default async function MyKpiPage() {
  const locale = await getLocale();
  const user = await getMe(locale);
  if (!user) redirect("/login");

  const t = await getTranslations("myKpi");

  if (user.kpi_template_id == null) {
    return (
      <div>
        <h1 className="mb-6 text-xl font-semibold text-text-1">{t("heading")}</h1>
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <IconClipboardOff size={32} stroke={1.5} className="text-text-3" />
          <p className="text-sm font-semibold text-text-1">{t("noTemplateAssigned")}</p>
          <p className="max-w-xs text-xs text-text-3">{t("noTemplateHint")}</p>
        </div>
      </div>
    );
  }

  const template = await getKpiTemplate(locale, user.kpi_template_id);
  if (!template) {
    return (
      <div>
        <h1 className="mb-6 text-xl font-semibold text-text-1">{t("heading")}</h1>
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <IconClipboardOff size={32} stroke={1.5} className="text-text-3" />
          <p className="text-sm font-semibold text-text-1">{t("noTemplateAssigned")}</p>
          <p className="max-w-xs text-xs text-text-3">{t("noTemplateHint")}</p>
        </div>
      </div>
    );
  }

  const defaultPeriod = template.academic_year;
  const initialRows = await getMyKpi(locale, defaultPeriod);

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-text-1">{t("heading")}</h1>
      <MyKpiWorkspace template={template} initialPeriod={defaultPeriod} initialRows={initialRows} />
    </div>
  );
}
