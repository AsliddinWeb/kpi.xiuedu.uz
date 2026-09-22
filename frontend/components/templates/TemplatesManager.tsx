"use client";

import {
  IconCalendarStats,
  IconCircleCheck,
  IconCircleX,
  IconFilterOff,
  IconLayoutGrid,
  IconPlus,
  IconSearch,
  IconStack3,
} from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { KpiTemplate } from "@/lib/kpiTemplates";
import IconField from "@/components/ui/IconField";

function StatChip({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof IconStack3;
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

export default function TemplatesManager({ initialTemplates }: { initialTemplates: KpiTemplate[] }) {
  const t = useTranslations("templates");
  const periodT = useTranslations("setup.period");

  const [templates] = useState(initialTemplates);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");

  const hasActiveFilters = !!(search || statusFilter || periodFilter);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((tpl) => {
      if (q && !tpl.name.toLowerCase().includes(q) && !tpl.annex_code.toLowerCase().includes(q)) return false;
      if (statusFilter === "active" && !tpl.is_active) return false;
      if (statusFilter === "inactive" && tpl.is_active) return false;
      if (periodFilter && tpl.period_type !== periodFilter) return false;
      return true;
    });
  }, [templates, search, statusFilter, periodFilter]);

  function clearFilters() {
    setSearch("");
    setStatusFilter("");
    setPeriodFilter("");
  }

  const stats = useMemo(
    () => ({
      total: templates.length,
      active: templates.filter((tpl) => tpl.is_active).length,
      inactive: templates.filter((tpl) => !tpl.is_active).length,
      categories: templates.reduce((sum, tpl) => sum + tpl.categories.length, 0),
    }),
    [templates],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <StatChip icon={IconStack3} label={t("totalCount")} value={stats.total} tone="text-accent" />
        <StatChip icon={IconCircleCheck} label={t("activeCount")} value={stats.active} tone="text-success" />
        <StatChip icon={IconCircleX} label={t("inactiveCount")} value={stats.inactive} tone="text-text-2" />
        <StatChip icon={IconLayoutGrid} label={t("categoriesCount")} value={stats.categories} tone="text-warning" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/dashboard/templates/new"
          className="flex w-fit items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-90 active:scale-[0.98]"
        >
          <IconPlus size={16} stroke={2} />
          {t("addTemplate")}
        </Link>
        <div className="group ml-auto flex min-w-[12rem] flex-1 items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2.5 transition-all focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft sm:max-w-xs">
          <IconSearch size={16} stroke={1.75} className="shrink-0 text-text-3 transition-colors group-focus-within:text-accent" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full bg-transparent text-sm text-text-1 outline-none placeholder:text-text-3"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="w-40">
          <IconField icon={IconCircleCheck}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-transparent text-sm text-text-1 outline-none"
            >
              <option value="">{t("allStatuses")}</option>
              <option value="active">{t("active")}</option>
              <option value="inactive">{t("inactive")}</option>
            </select>
          </IconField>
        </div>
        <div className="w-40">
          <IconField icon={IconCalendarStats}>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="w-full bg-transparent text-sm text-text-1 outline-none"
            >
              <option value="">{t("allPeriods")}</option>
              <option value="monthly">{periodT("monthly")}</option>
              <option value="quarterly">{periodT("quarterly")}</option>
              <option value="yearly">{periodT("yearly")}</option>
            </select>
          </IconField>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-sm font-medium text-text-3 transition-colors hover:text-text-1"
          >
            <IconFilterOff size={15} stroke={1.75} />
            {t("clearFilters")}
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((template) => (
          <Link
            key={template.id}
            href={`/dashboard/templates/${template.id}`}
            className="group flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-sm font-bold text-accent">
                {template.annex_code}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-text-1 group-hover:text-accent">{template.name}</h3>
                <p className="text-xs text-text-3">
                  {template.academic_year} · {periodT(template.period_type)}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${
                  template.is_active ? "bg-success-soft text-success" : "bg-surface-alt text-text-3"
                }`}
              >
                {template.is_active ? t("active") : t("inactive")}
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-text-3">
              <span>{t("categoriesCount")}: <span className="font-semibold text-text-2">{template.categories.length}</span></span>
              <span className="font-semibold text-text-2 tabular-nums">{t("baseTotal", { total: template.total_max_score })}</span>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center gap-3 rounded-xl border border-border bg-surface px-6 py-16 text-center shadow-soft">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-alt text-text-3">
              <IconStack3 size={22} stroke={1.5} />
            </div>
            <p className="text-sm font-medium text-text-1">{templates.length === 0 ? t("noTemplates") : t("noResults")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
