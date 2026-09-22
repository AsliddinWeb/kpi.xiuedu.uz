import { IconArrowLeft } from "@tabler/icons-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import DepartmentForm from "@/components/structure/DepartmentForm";
import PositionsManager from "@/components/structure/PositionsManager";
import { getMe } from "@/lib/auth";
import { getDepartment, getDepartments } from "@/lib/departments";

export default async function EditDepartmentPage({ params }: { params: { id: string } }) {
  const locale = await getLocale();
  const user = await getMe(locale);
  if (!user) redirect("/login");
  if (user.role !== "super_admin" && user.role !== "admin") redirect("/dashboard");

  const id = Number(params.id);
  const [department, departments] = await Promise.all([getDepartment(locale, id), getDepartments(locale)]);
  const t = await getTranslations("structure");

  if (!department) notFound();

  return (
    <div>
      <Link
        href="/dashboard/structure"
        className="mb-4 flex w-fit items-center gap-1.5 text-sm font-medium text-text-3 transition-colors hover:text-text-1"
      >
        <IconArrowLeft size={15} stroke={2} />
        {t("backToList")}
      </Link>
      <h1 className="mb-6 text-xl font-semibold text-text-1">{t("editDepartment")}</h1>
      <DepartmentForm mode="edit" department={department} departments={departments} />
      <PositionsManager departmentId={department.id} initialPositions={department.positions} />
    </div>
  );
}
