import { getLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import CategoryAssignmentView from "@/components/templates/CategoryAssignmentView";
import { getMe } from "@/lib/auth";
import { getCategoryHeadApprovers } from "@/lib/categoryHeadApprovers";
import { getCategoryReviewers } from "@/lib/categoryReviewers";
import { getEmployees } from "@/lib/employees";
import { getKpiTemplate } from "@/lib/kpiTemplates";

export default async function CategoryAssignmentPage({
  params,
}: {
  params: { id: string; categoryId: string };
}) {
  const locale = await getLocale();
  const user = await getMe(locale);
  if (!user) redirect("/login");
  if (user.role !== "super_admin" && user.role !== "admin") redirect("/dashboard");

  const [template, employees, reviewers, headApprovers] = await Promise.all([
    getKpiTemplate(locale, Number(params.id)),
    getEmployees(locale),
    getCategoryReviewers(locale),
    getCategoryHeadApprovers(locale),
  ]);

  if (!template) notFound();
  const category = template.categories.find((c) => c.id === Number(params.categoryId));
  if (!category) notFound();

  return (
    <CategoryAssignmentView
      template={template}
      category={category}
      employees={employees}
      initialReviewers={reviewers.filter((r) => r.kpi_category_id === category.id)}
      initialHeadApprovers={headApprovers.filter((a) => a.kpi_category_id === category.id)}
    />
  );
}
