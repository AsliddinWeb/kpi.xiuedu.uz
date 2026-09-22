import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import EmployeesManager from "@/components/employees/EmployeesManager";
import { EMPLOYEES_VIEWERS } from "@/components/dashboard/nav-items";
import { getMe } from "@/lib/auth";
import { getDepartments } from "@/lib/departments";
import { getEmployees } from "@/lib/employees";
import { getKpiTemplates } from "@/lib/kpiTemplates";

export default async function EmployeesPage() {
  const locale = await getLocale();
  const user = await getMe(locale);
  if (!user) redirect("/login");
  if (!EMPLOYEES_VIEWERS(user.role)) redirect("/dashboard");

  const [employees, departments, kpiTemplates] = await Promise.all([
    getEmployees(locale),
    getDepartments(locale),
    getKpiTemplates(locale),
  ]);
  const t = await getTranslations("employees");

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-text-1">{t("heading")}</h1>
      <EmployeesManager
        initialEmployees={employees}
        departments={departments}
        kpiTemplates={kpiTemplates}
        viewerRole={user.role}
      />
    </div>
  );
}
