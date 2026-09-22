import { getLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import CategoryArizalarWorkspace from "@/components/arizalar/CategoryArizalarWorkspace";
import { getArizalar } from "@/lib/arizalar";
import { getMe } from "@/lib/auth";
import { getKpiTemplates } from "@/lib/kpiTemplates";

export default async function CategoryArizalarPage({ params }: { params: { categoryId: string } }) {
  const locale = await getLocale();
  const user = await getMe(locale);
  if (!user) redirect("/login");
  if (user.role === "employee") redirect("/dashboard");

  const categoryId = Number(params.categoryId);
  const [arizalar, templates] = await Promise.all([getArizalar(locale), getKpiTemplates(locale)]);

  const scoped = arizalar.filter((a) => a.kpi_category_id === categoryId);
  if (scoped.length === 0) {
    const categoryExists = templates.some((tpl) => tpl.categories.some((c) => c.id === categoryId));
    if (!categoryExists) notFound();
  }

  const categoryName = scoped[0]?.category_name ?? templates.flatMap((tpl) => tpl.categories).find((c) => c.id === categoryId)?.name ?? "";

  const indicatorOrder: Record<number, number> = {};
  for (const template of templates) {
    for (const category of template.categories) {
      if (category.id !== categoryId) continue;
      for (const indicator of category.indicators) {
        indicatorOrder[indicator.id] = indicator.order_index;
      }
    }
  }

  return <CategoryArizalarWorkspace categoryName={categoryName} initialArizalar={scoped} indicatorOrder={indicatorOrder} />;
}
