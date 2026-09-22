import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import TemplatesManager from "@/components/templates/TemplatesManager";
import { getMe } from "@/lib/auth";
import { getKpiTemplates } from "@/lib/kpiTemplates";

export default async function TemplatesPage() {
  const locale = await getLocale();
  const user = await getMe(locale);
  if (!user) redirect("/login");
  if (user.role !== "super_admin" && user.role !== "admin") redirect("/dashboard");

  const templates = await getKpiTemplates(locale);
  const t = await getTranslations("templates");

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-text-1">{t("heading")}</h1>
      <TemplatesManager initialTemplates={templates} />
    </div>
  );
}
