import { IconArrowLeft } from "@tabler/icons-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import EmployeeForm from "@/components/employees/EmployeeForm";
import { getMe } from "@/lib/auth";
import { getDepartments } from "@/lib/departments";
import { getEmployee, getEmployees } from "@/lib/employees";
import { getKpiTemplates } from "@/lib/kpiTemplates";

export default async function EditEmployeePage({ params }: { params: { id: string } }) {
  const locale = await getLocale();
  const user = await getMe(locale);
  if (!user) redirect("/login");
  if (user.role !== "super_admin" && user.role !== "admin") redirect("/dashboard");

  const id = Number(params.id);
  const [employee, employees, departments, kpiTemplates] = await Promise.all([
    getEmployee(locale, id),
    getEmployees(locale),
    getDepartments(locale),
    getKpiTemplates(locale),
  ]);
  const t = await getTranslations("employees");

  if (!employee) notFound();

  return (
    <div>
      <Link
        href="/dashboard/employees"
        className="mb-4 flex w-fit items-center gap-1.5 text-sm font-medium text-text-3 transition-colors hover:text-text-1"
      >
        <IconArrowLeft size={15} stroke={2} />
        {t("backToList")}
      </Link>
      <h1 className="mb-6 text-xl font-semibold text-text-1">{t("editEmployee")}</h1>
      <EmployeeForm
        mode="edit"
        employee={employee}
        employees={employees}
        departments={departments}
        kpiTemplates={kpiTemplates}
        viewerRole={user.role}
      />
    </div>
  );
}
