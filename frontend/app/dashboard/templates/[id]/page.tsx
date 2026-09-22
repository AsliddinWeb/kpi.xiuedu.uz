import { getLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import TemplateDetailView from "@/components/templates/TemplateDetailView";
import { getMe } from "@/lib/auth";
import { getCategoryHeadApprovers } from "@/lib/categoryHeadApprovers";
import { getCategoryReviewers } from "@/lib/categoryReviewers";
import { getKpiTemplate } from "@/lib/kpiTemplates";

export default async function TemplateDetailPage({ params }: { params: { id: string } }) {
  const locale = await getLocale();
  const user = await getMe(locale);
  if (!user) redirect("/login");
  if (user.role !== "super_admin" && user.role !== "admin") redirect("/dashboard");

  const [template, reviewers, headApprovers] = await Promise.all([
    getKpiTemplate(locale, Number(params.id)),
    getCategoryReviewers(locale),
    getCategoryHeadApprovers(locale),
  ]);

  if (!template) notFound();

  return <TemplateDetailView template={template} reviewers={reviewers} headApprovers={headApprovers} />;
}
