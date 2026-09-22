import { IconArrowLeft } from "@tabler/icons-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import DepartmentForm from "@/components/structure/DepartmentForm";
import { getMe } from "@/lib/auth";
import { getDepartments } from "@/lib/departments";

export default async function NewDepartmentPage() {
  const locale = await getLocale();
  const user = await getMe(locale);
  if (!user) redirect("/login");
  if (user.role !== "super_admin" && user.role !== "admin") redirect("/dashboard");

  const departments = await getDepartments(locale);
  const t = await getTranslations("structure");

  return (
    <div>
      <Link
        href="/dashboard/structure"
        className="mb-4 flex w-fit items-center gap-1.5 text-sm font-medium text-text-3 transition-colors hover:text-text-1"
      >
        <IconArrowLeft size={15} stroke={2} />
        {t("backToList")}
      </Link>
      <h1 className="mb-6 text-xl font-semibold text-text-1">{t("newDepartment")}</h1>
      <DepartmentForm mode="create" department={null} departments={departments} />
    </div>
  );
}
