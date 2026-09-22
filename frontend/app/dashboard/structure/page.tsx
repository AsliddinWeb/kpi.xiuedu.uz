import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import StructureManager from "@/components/structure/StructureManager";
import { getMe } from "@/lib/auth";
import { getDepartments } from "@/lib/departments";

export default async function StructurePage() {
  const locale = await getLocale();
  const user = await getMe(locale);
  if (!user) redirect("/login");
  if (user.role !== "super_admin" && user.role !== "admin") redirect("/dashboard");

  const departments = await getDepartments(locale);
  const t = await getTranslations("structure");

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-text-1">{t("heading")}</h1>
      <StructureManager initialDepartments={departments} />
    </div>
  );
}
