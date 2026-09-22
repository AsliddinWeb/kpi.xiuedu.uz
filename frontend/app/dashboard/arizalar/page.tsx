import { IconArrowRight, IconCircleCheck, IconClipboardList, IconClock, IconInbox, IconCircleX } from "@tabler/icons-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import BreakdownDonutCard from "@/components/dashboard/BreakdownDonutCard";
import { getArizalar } from "@/lib/arizalar";
import { getMe } from "@/lib/auth";
import { getKpiTemplates } from "@/lib/kpiTemplates";

const SECTION_BAR_COLORS = ["bg-accent", "bg-success", "bg-warning", "bg-danger", "bg-[#8b5cf6]", "bg-[#0ea5e9]"];
const SECTION_DONUT_COLORS = ["var(--accent)", "var(--success)", "var(--warning)", "var(--danger)", "#8b5cf6", "#0ea5e9"];

export default async function ArizalarPage() {
  const locale = await getLocale();
  const user = await getMe(locale);
  if (!user) redirect("/login");
  if (user.role === "employee") redirect("/dashboard");

  const [arizalar, templates] = await Promise.all([getArizalar(locale), getKpiTemplates(locale)]);
  const t = await getTranslations("arizalar");

  const categoryOrder: Record<number, number> = {};
  const byCategory = new Map<
    number,
    { id: number; name: string; total: number; pending: number; scored: number; approved: number; rejected: number }
  >();

  // Seed every category that exists in the current templates first, so a
  // category with zero submissions so far still shows up (with a 0 badge)
  // instead of silently disappearing from the index.
  for (const template of templates) {
    for (const category of template.categories) {
      categoryOrder[category.id] = category.order_index;
      if (!byCategory.has(category.id)) {
        byCategory.set(category.id, { id: category.id, name: category.name, total: 0, pending: 0, scored: 0, approved: 0, rejected: 0 });
      }
    }
  }

  for (const a of arizalar) {
    if (!byCategory.has(a.kpi_category_id)) {
      byCategory.set(a.kpi_category_id, { id: a.kpi_category_id, name: a.category_name, total: 0, pending: 0, scored: 0, approved: 0, rejected: 0 });
    }
    const entry = byCategory.get(a.kpi_category_id)!;
    entry.total += 1;
    if (a.status === "submitted" || a.status === "kafedra_endorsed" || a.status === "pending_head_approval") entry.pending += 1;
    if (a.status === "scored") entry.scored += 1;
    if (a.status === "approved") entry.approved += 1;
    if (a.status === "rejected") entry.rejected += 1;
  }
  const categories = Array.from(byCategory.values()).sort(
    (x, y) => (categoryOrder[x.id] ?? 999) - (categoryOrder[y.id] ?? 999),
  );

  const stats = {
    total: arizalar.length,
    pending: categories.reduce((sum, c) => sum + c.pending, 0),
    scored: categories.reduce((sum, c) => sum + c.scored, 0),
    rejected: categories.reduce((sum, c) => sum + c.rejected, 0),
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-text-1">{t("heading")}</h1>

      <div className="grid gap-3 sm:grid-cols-4">
        <StatChip icon={IconClipboardList} label={t("totalCount")} value={stats.total} tone="text-accent" />
        <StatChip icon={IconClock} label={t("pendingCount")} value={stats.pending} tone="text-warning" />
        <StatChip icon={IconCircleCheck} label={t("scoredCount")} value={stats.scored} tone="text-success" />
        <StatChip icon={IconCircleX} label={t("rejectedCount")} value={stats.rejected} tone="text-danger" />
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface px-6 py-16 text-center shadow-soft">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-alt text-text-3">
            <IconInbox size={22} stroke={1.5} />
          </div>
          <p className="text-sm font-medium text-text-1">{t("noArizalar")}</p>
        </div>
      ) : (
        <>
          {categories.length > 1 && (
            <BreakdownDonutCard
              title={t("categoryWorkload")}
              segments={categories.map((c, i) => ({
                label: c.name,
                value: c.total,
                colorVar: SECTION_DONUT_COLORS[i % SECTION_DONUT_COLORS.length],
              }))}
            />
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category, i) => (
              <Link
                key={category.id}
                href={`/dashboard/arizalar/${category.id}`}
                className="group relative overflow-hidden rounded-xl border border-border bg-surface pl-3 shadow-soft transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg"
              >
                <span className={`absolute inset-y-0 left-0 w-1 ${SECTION_BAR_COLORS[i % SECTION_BAR_COLORS.length]}`} />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-text-1 group-hover:text-accent">{category.name}</p>
                    <span className="shrink-0 rounded-full bg-surface-alt px-2.5 py-1 text-xs font-semibold text-text-2 tabular-nums">
                      {category.total}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-3">
                    <span>{t("pendingCount")}: <span className="font-semibold text-warning">{category.pending}</span></span>
                    <span>{t("scoredCount")}: <span className="font-semibold text-success">{category.scored}</span></span>
                    {category.rejected > 0 && (
                      <span>{t("rejectedCount")}: <span className="font-semibold text-danger">{category.rejected}</span></span>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs font-semibold text-accent">
                    {t("reviewCategory")}
                    <IconArrowRight size={14} stroke={2} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatChip({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof IconClipboardList;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-current/10 ${tone}`}>
        <Icon size={18} stroke={1.75} />
      </div>
      <div>
        <p className="text-lg font-bold leading-none text-text-1 tabular-nums">{value}</p>
        <p className="text-xs text-text-3">{label}</p>
      </div>
    </div>
  );
}
