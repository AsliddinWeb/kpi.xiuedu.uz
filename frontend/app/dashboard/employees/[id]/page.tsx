import { IconArrowLeft } from "@tabler/icons-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import EmployeeDetailView from "@/components/employees/EmployeeDetailView";
import { EMPLOYEES_VIEWERS } from "@/components/dashboard/nav-items";
import { getMe } from "@/lib/auth";
import { getDepartment } from "@/lib/departments";
import { getEmployee, getEmployees } from "@/lib/employees";
import { getMyKpi } from "@/lib/dashboard";
import { getMyKpiResults } from "@/lib/kpiResults";
import { getKpiTemplate } from "@/lib/kpiTemplates";

export default async function EmployeeDetailPage({ params }: { params: { id: string } }) {
  const locale = await getLocale();
  const viewer = await getMe(locale);
  if (!viewer) redirect("/login");

  const id = Number(params.id);
  const employee = await getEmployee(locale, id);
  if (!employee) notFound();

  const canView =
    EMPLOYEES_VIEWERS(viewer.role) ||
    viewer.id === employee.id ||
    (viewer.role === "manager" && employee.manager_id === viewer.id);
  if (!canView) redirect("/dashboard");

  const [department, template, employees] = await Promise.all([
    employee.department_id ? getDepartment(locale, employee.department_id) : Promise.resolve(null),
    employee.kpi_template_id ? getKpiTemplate(locale, employee.kpi_template_id) : Promise.resolve(null),
    getEmployees(locale),
  ]);
  const position = department?.positions.find((p) => p.id === employee.position_id) ?? null;
  const manager = employees.find((e) => e.id === employee.manager_id) ?? null;

  const defaultPeriod = template?.academic_year ?? null;
  const [kpiResults, myKpiRows] = await Promise.all([
    getMyKpiResults(locale, employee.id),
    defaultPeriod ? getMyKpi(locale, defaultPeriod, employee.id) : Promise.resolve([]),
  ]);

  const t = await getTranslations("employeeDetail");

  return (
    <div>
      <Link
        href="/dashboard/employees"
        className="mb-4 flex w-fit items-center gap-1.5 text-sm font-medium text-text-3 transition-colors hover:text-text-1"
      >
        <IconArrowLeft size={15} stroke={2} />
        {t("backToList")}
      </Link>
      <h1 className="mb-6 text-xl font-semibold text-text-1">{t("heading")}</h1>
      <EmployeeDetailView
        employee={employee}
        department={department}
        position={position}
        managerName={manager?.full_name ?? null}
        template={template}
        defaultPeriod={defaultPeriod}
        initialKpiResults={kpiResults}
        initialRows={myKpiRows}
      />
    </div>
  );
}
