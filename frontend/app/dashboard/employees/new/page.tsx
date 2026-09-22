import { IconArrowLeft } from "@tabler/icons-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import EmployeeForm from "@/components/employees/EmployeeForm";
import { getMe } from "@/lib/auth";
import { getDepartments } from "@/lib/departments";
import { getEmployees } from "@/lib/employees";
import { getKpiTemplates } from "@/lib/kpiTemplates";

export default async function NewEmployeePage() {
  const locale = await getLocale();
  const user = await getMe(locale);
  if (!user) redirect("/login");
  if (user.role !== "super_admin" && user.role !== "admin") redirect("/dashboard");

  const [employees, departments, kpiTemplates] = await Promise.all([
    getEmployees(locale),
    getDepartments(locale),
    getKpiTemplates(locale),
  ]);
  const t = await getTranslations("employees");

  return (
    <div>
      <Link
        href="/dashboard/employees"
        className="mb-4 flex w-fit items-center gap-1.5 text-sm font-medium text-text-3 transition-colors hover:text-text-1"
      >
        <IconArrowLeft size={15} stroke={2} />
        {t("backToList")}
      </Link>
      <h1 className="mb-6 text-xl font-semibold text-text-1">{t("newEmployee")}</h1>
      <EmployeeForm
        mode="create"
        employee={null}
        employees={employees}
        departments={departments}
        kpiTemplates={kpiTemplates}
        viewerRole={user.role}
      />
    </div>
  );
}
