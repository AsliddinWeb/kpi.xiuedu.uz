"use client";

import {
  IconAlertTriangle,
  IconArrowLeft,
  IconArrowRight,
  IconCircleCheck,
  IconClipboardCheck,
  IconGift,
  IconLayoutGrid,
  IconPencil,
  IconPower,
  IconShieldCheck,
  IconStack3,
  IconTrash,
  IconUserCheck,
  IconUsersGroup,
} from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import BreakdownDonutCard from "@/components/dashboard/BreakdownDonutCard";
import StatCard from "@/components/dashboard/StatCard";
import type { CategoryHeadApprover } from "@/lib/categoryHeadApprovers";
import type { CategoryReviewer } from "@/lib/categoryReviewers";
import type { KpiTemplate } from "@/lib/kpiTemplates";

const ACCENT_BAR_COLORS = ["bg-accent", "bg-success", "bg-warning", "bg-danger", "bg-[#8b5cf6]", "bg-[#0ea5e9]"];
const ACCENT_DONUT_COLORS = ["var(--accent)", "var(--success)", "var(--warning)", "var(--danger)", "#8b5cf6", "#0ea5e9"];

export default function TemplateDetailView({
  template,
  reviewers,
  headApprovers,
}: {
  template: KpiTemplate;
  reviewers: CategoryReviewer[];
  headApprovers: CategoryHeadApprover[];
}) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("templates");
  const periodT = useTranslations("setup.period");

  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(template.is_active);
  const [busy, setBusy] = useState(false);

  const categoryIds = new Set(template.categories.map((c) => c.id));
  const scopedReviewers = reviewers.filter((r) => categoryIds.has(r.kpi_category_id));
  const scopedHeadApprovers = headApprovers.filter((a) => categoryIds.has(a.kpi_category_id));
  const totalIndicators = template.categories.reduce((sum, c) => sum + c.indicators.length, 0);

  async function toggleActive() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/kpi-templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Accept-Language": locale },
        credentials: "include",
        body: JSON.stringify({ is_active: !active }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.detail ?? t("genericError"));
        return;
      }
      setActive((v) => !v);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function deleteTemplate() {
    if (!window.confirm(t("deleteTemplate") + "?")) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/kpi-templates/${template.id}`, {
        method: "DELETE",
        headers: { "Accept-Language": locale },
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.detail ?? t("genericError"));
        return;
      }
      router.push("/dashboard/templates");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/templates"
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-text-3 transition-colors hover:text-text-1"
      >
        <IconArrowLeft size={15} stroke={2} />
        {t("backToList")}
      </Link>

      {error && (
        <p className="rounded-lg border border-danger-soft bg-danger-soft px-3 py-2.5 text-sm text-danger">{error}</p>
      )}

      <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-base font-bold text-accent">
              {template.annex_code}
            </div>
            <div>
              <h1 className="text-base font-semibold text-text-1">{template.name}</h1>
              <p className="text-xs text-text-3">
                {template.annex_code}-{t("annexLabel")} · {template.academic_year} · {periodT(template.period_type)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                template.total_max_score === 100 || template.total_max_score === 110
                  ? "bg-success-soft text-success"
                  : "bg-warning-soft text-warning"
              }`}
            >
              {template.total_max_score === 100 || template.total_max_score === 110 ? (
                <IconCircleCheck size={13} stroke={2} />
              ) : (
                <IconAlertTriangle size={13} stroke={2} />
              )}
              {t("baseTotal", { total: template.total_max_score })}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${active ? "bg-success-soft text-success" : "bg-surface-alt text-text-3"}`}>
              {active ? t("active") : t("inactive")}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <Link
            href={`/dashboard/templates/${template.id}/edit`}
            className="flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-90 active:scale-[0.98]"
          >
            <IconPencil size={14} stroke={2} />
            {t("edit")}
          </Link>
          <button
            type="button"
            onClick={toggleActive}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-text-1 transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
          >
            <IconPower size={14} stroke={2} />
            {active ? t("deactivate") : t("activate")}
          </button>
          <button
            type="button"
            onClick={deleteTemplate}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-danger transition-colors hover:border-danger disabled:opacity-50"
          >
            <IconTrash size={14} stroke={2} />
            {t("deleteTemplate")}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title={t("categoriesCount")} value={String(template.categories.length)} icon={IconLayoutGrid} />
        <StatCard title={t("indicatorsCount")} value={String(totalIndicators)} icon={IconStack3} tone="success" />
        <StatCard title={t("reviewersAssigned")} value={String(scopedReviewers.length)} icon={IconUsersGroup} tone="warning" />
        <StatCard title={t("headApproversAssigned")} value={String(scopedHeadApprovers.length)} icon={IconClipboardCheck} tone="danger" />
      </div>

      {template.categories.length > 0 && (
        <BreakdownDonutCard
          title={t("categoryDistribution")}
          segments={template.categories.map((category, i) => ({
            label: category.name,
            value: category.max_score,
            colorVar: ACCENT_DONUT_COLORS[i % ACCENT_DONUT_COLORS.length],
          }))}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {template.categories.map((category, categoryIndex) => {
          const categoryReviewerCount = scopedReviewers.filter((r) => r.kpi_category_id === category.id).length;
          const categoryApproverCount = scopedHeadApprovers.filter((a) => a.kpi_category_id === category.id).length;
          return (
            <Link
              key={category.id}
              href={`/dashboard/templates/${template.id}/categories/${category.id}`}
              className="group relative overflow-hidden rounded-xl border border-border bg-surface pl-3 shadow-soft transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg"
            >
              <span className={`absolute inset-y-0 left-0 w-1 ${ACCENT_BAR_COLORS[categoryIndex % ACCENT_BAR_COLORS.length]}`} />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-text-1 group-hover:text-accent">{category.name}</p>
                  <span className="shrink-0 rounded-full bg-surface-alt px-2.5 py-1 text-xs font-semibold text-text-2 tabular-nums">
                    {category.max_score}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {category.is_bonus_category && (
                    <span title={t("bonusCategory")} className="text-warning">
                      <IconGift size={14} stroke={1.75} />
                    </span>
                  )}
                  {category.requires_kafedra_endorsement && (
                    <span title={t("requiresEndorsement")} className="text-accent">
                      <IconShieldCheck size={14} stroke={1.75} />
                    </span>
                  )}
                  {category.requires_head_approval && (
                    <span title={t("requiresHeadApproval")} className="text-warning">
                      <IconUserCheck size={14} stroke={1.75} />
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-text-3">
                  <span>{t("indicatorsCount")}: <span className="font-semibold text-text-2">{category.indicators.length}</span></span>
                  <span>{t("reviewersAssigned")}: <span className="font-semibold text-text-2">{categoryReviewerCount}</span></span>
                  {category.requires_head_approval && (
                    <span>{t("headApproversAssigned")}: <span className="font-semibold text-text-2">{categoryApproverCount}</span></span>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between text-xs font-semibold text-accent">
                  {t("manageAssignments")}
                  <IconArrowRight size={14} stroke={2} className="transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
