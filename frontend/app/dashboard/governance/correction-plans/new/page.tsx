import { IconArrowLeft } from "@tabler/icons-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import CorrectionPlanForm from "@/components/governance/CorrectionPlanForm";
import { getMe } from "@/lib/auth";
import { getEmployees } from "@/lib/employees";

export default async function NewCorrectionPlanPage() {
  const locale = await getLocale();
  const user = await getMe(locale);
  if (!user) redirect("/login");
  if (user.role !== "super_admin" && user.role !== "admin") redirect("/dashboard");

  const employees = await getEmployees(locale);
  const t = await getTranslations("governance");

  return (
    <div>
      <Link
        href="/dashboard/governance"
        className="mb-4 flex w-fit items-center gap-1.5 text-sm font-medium text-text-3 transition-colors hover:text-text-1"
      >
        <IconArrowLeft size={15} stroke={2} />
        {t("backToList")}
      </Link>
      <h1 className="mb-6 text-xl font-semibold text-text-1">{t("newCorrectionPlan")}</h1>
      <CorrectionPlanForm employees={employees} />
    </div>
  );
}
