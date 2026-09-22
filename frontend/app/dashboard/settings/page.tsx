import { IconBriefcase, IconBuildingSkyscraper, IconClipboardList, IconUsers } from "@tabler/icons-react";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import SettingsForm from "@/components/settings/SettingsForm";
import StatChip from "@/components/ui/StatChip";
import { getMe } from "@/lib/auth";
import { getCompanySettings } from "@/lib/company";
import { getDepartments } from "@/lib/departments";
import { getEmployees } from "@/lib/employees";
import { getKpiTemplates } from "@/lib/kpiTemplates";

export default async function SettingsPage() {
  const locale = await getLocale();
  const user = await getMe(locale);
  if (!user) redirect("/login");
  if (user.role !== "super_admin" && user.role !== "admin") redirect("/dashboard");

  const [company, employees, departments, templates] = await Promise.all([
    getCompanySettings(locale),
    getEmployees(locale),
    getDepartments(locale),
    getKpiTemplates(locale),
  ]);
  const t = await getTranslations("settings");

  if (!company) {
    return <p className="text-sm text-text-2">{t("notFound")}</p>;
  }

  return (
    <div className="max-w-5xl">
      <h1 className="mb-6 text-xl font-semibold text-text-1">{t("heading")}</h1>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatChip icon={IconUsers} label={t("overview.employees")} value={employees.length} tone="text-accent" />
        <StatChip
          icon={IconBuildingSkyscraper}
          label={t("overview.departments")}
          value={departments.length}
          tone="text-success"
        />
        <StatChip
          icon={IconBriefcase}
          label={t("overview.positions")}
          value={departments.reduce((sum, d) => sum + d.positions.length, 0)}
          tone="text-warning"
        />
        <StatChip icon={IconClipboardList} label={t("overview.templates")} value={templates.length} tone="text-text-2" />
      </div>

      <SettingsForm company={company} />
    </div>
  );
}
