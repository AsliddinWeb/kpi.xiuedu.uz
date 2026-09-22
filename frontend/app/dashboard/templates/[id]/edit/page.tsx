import { IconArrowLeft } from "@tabler/icons-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import TemplateForm from "@/components/templates/TemplateForm";
import { getMe } from "@/lib/auth";
import { getKpiTemplate } from "@/lib/kpiTemplates";

export default async function EditTemplatePage({ params }: { params: { id: string } }) {
  const locale = await getLocale();
  const user = await getMe(locale);
  if (!user) redirect("/login");
  if (user.role !== "super_admin" && user.role !== "admin") redirect("/dashboard");

  const template = await getKpiTemplate(locale, Number(params.id));
  const t = await getTranslations("templates");

  if (!template) notFound();

  return (
    <div>
      <Link
        href="/dashboard/templates"
        className="mb-4 flex w-fit items-center gap-1.5 text-sm font-medium text-text-3 transition-colors hover:text-text-1"
      >
        <IconArrowLeft size={15} stroke={2} />
        {t("backToList")}
      </Link>
      <h1 className="mb-6 text-xl font-semibold text-text-1">{t("editTemplate")}</h1>
      <TemplateForm mode="edit" template={template} />
    </div>
  );
}
