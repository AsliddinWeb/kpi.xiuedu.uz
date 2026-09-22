"use client";

import {
  IconAlertTriangle,
  IconCalendar,
  IconCircleCheck,
  IconClipboardList,
  IconFlag3,
  IconPlus,
  IconTarget,
  IconTrash,
  IconTrendingUp,
} from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import BreakdownDonutCard from "@/components/dashboard/BreakdownDonutCard";
import StatCard from "@/components/dashboard/StatCard";
import type { KpiTemplate } from "@/lib/kpiTemplates";
import type { WorkPlan } from "@/lib/workPlans";

type DraftItem = { kpiIndicatorId: string; plannedCount: string };

const CLASSIFICATION_TONE: Record<string, string> = {
  under: "bg-warning-soft text-warning",
  met: "bg-success-soft text-success",
  exceeded: "bg-accent-soft text-accent",
};

const CLASSIFICATION_ICON: Record<string, typeof IconTarget> = {
  under: IconAlertTriangle,
  met: IconCircleCheck,
  exceeded: IconTrendingUp,
};

export default function WorkPlanWorkspace({
  template,
  initialPlans,
  defaultPeriod,
}: {
  template: KpiTemplate | null;
  initialPlans: WorkPlan[];
  defaultPeriod: string;
}) {
  const locale = useLocale();
  const t = useTranslations("workPlan");

  const [plans, setPlans] = useState(initialPlans);
  const period = defaultPeriod;
  const [items, setItems] = useState<DraftItem[]>([{ kpiIndicatorId: "", plannedCount: "" }]);
  const [showForm, setShowForm] = useState(plans.length === 0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allIndicators = (template?.categories ?? []).flatMap((c) =>
    c.indicators.map((i) => ({ id: i.id, label: `${c.name} · ${i.name}` })),
  );

  const hasActivePlanForPeriod = plans.some((p) => p.period === period && p.status === "active");
  const activePlan = plans.find((p) => p.period === period && p.status === "active") ?? null;

  const allItems = useMemo(() => plans.flatMap((p) => p.items), [plans]);
  const classificationBreakdown = useMemo(
    () => ({
      under: allItems.filter((i) => i.classification === "under").length,
      met: allItems.filter((i) => i.classification === "met").length,
      exceeded: allItems.filter((i) => i.classification === "exceeded").length,
    }),
    [allItems],
  );
  const fulfillmentRate = allItems.length
    ? Math.round(((classificationBreakdown.met + classificationBreakdown.exceeded) / allItems.length) * 100)
    : null;

  function updateItem(index: number, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { kpiIndicatorId: "", plannedCount: "" }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function refresh() {
    const res = await fetch("/api/v1/work-plans", {
      headers: { "Accept-Language": locale },
      credentials: "include",
      cache: "no-store",
    });
    if (res.ok) setPlans(await res.json());
  }

  async function submitPlan(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const validItems = items.filter((it) => it.kpiIndicatorId && it.plannedCount);
    if (!period.trim() || validItems.length === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/work-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept-Language": locale },
        credentials: "include",
        body: JSON.stringify({
          period: period.trim(),
          items: validItems.map((it) => ({
            kpi_indicator_id: Number(it.kpiIndicatorId),
            planned_count: Number(it.plannedCount),
          })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.detail ?? t("genericError"));
        return;
      }
      setItems([{ kpiIndicatorId: "", plannedCount: "" }]);
      setShowForm(false);
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function closePlan(id: number) {
    setError(null);
    const res = await fetch(`/api/v1/work-plans/${id}/close`, {
      method: "PATCH",
      headers: { "Accept-Language": locale },
      credentials: "include",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.detail ?? t("genericError"));
      return;
    }
    await refresh();
  }

  return (
    <div className="space-y-5">
      {error && (
        <p className="rounded-lg border border-danger-soft bg-danger-soft px-3 py-2.5 text-sm text-danger">{error}</p>
      )}

      <p className="rounded-lg bg-accent-soft px-3 py-2.5 text-xs text-accent">{t("intro")}</p>

      {allItems.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title={t("period")} value={period} icon={IconCalendar} />
            <StatCard
              title={t("planStatus")}
              value={activePlan ? t("status.active") : t("noActivePlan")}
              icon={IconFlag3}
              tone={activePlan ? "success" : "warning"}
            />
            <StatCard title={t("itemsCount")} value={String(allItems.length)} icon={IconClipboardList} />
            <StatCard
              title={t("fulfillmentRate")}
              value={fulfillmentRate != null ? `${fulfillmentRate}%` : "—"}
              icon={IconTrendingUp}
              tone={fulfillmentRate != null && fulfillmentRate >= 100 ? "success" : "warning"}
            />
          </div>

          <BreakdownDonutCard
            title={t("classificationBreakdown")}
            segments={[
              { label: t("classification.met"), value: classificationBreakdown.met, colorVar: "var(--success)" },
              { label: t("classification.exceeded"), value: classificationBreakdown.exceeded, colorVar: "var(--accent)" },
              { label: t("classification.under"), value: classificationBreakdown.under, colorVar: "var(--warning)" },
            ]}
          />
        </>
      )}

      {plans.length === 0 && !showForm ? null : (
        <div className="space-y-4">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-xl border border-border bg-surface p-5 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <IconFlag3 size={16} stroke={1.75} className="text-text-3" />
                  <p className="text-sm font-semibold text-text-1">{plan.period}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      plan.status === "active" ? "bg-success-soft text-success" : "bg-surface-alt text-text-3"
                    }`}
                  >
                    {t(`status.${plan.status}`)}
                  </span>
                  {plan.status === "active" && (
                    <button
                      type="button"
                      onClick={() => closePlan(plan.id)}
                      className="text-xs font-medium text-text-3 transition-colors hover:text-danger"
                    >
                      {t("closePlan")}
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3.5 space-y-2.5">
                {plan.items.map((item) => {
                  const Icon = CLASSIFICATION_ICON[item.classification];
                  const percent = item.planned_count > 0 ? (item.actual_count / item.planned_count) * 100 : 0;
                  return (
                    <div key={item.kpi_indicator_id} className="rounded-lg border border-border bg-bg p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm text-text-2">{item.indicator_name}</span>
                        <span
                          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${CLASSIFICATION_TONE[item.classification]}`}
                        >
                          <Icon size={13} stroke={2} />
                          {t(`classification.${item.classification}`)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-xs text-text-3">
                        <span>{t("progress")}</span>
                        <span className="font-semibold text-text-1 tabular-nums">
                          {item.actual_count} / {item.planned_count}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-alt">
                        <div
                          className="h-full rounded-full bg-accent transition-[width] duration-500"
                          style={{ width: `${Math.min(percent, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <form onSubmit={submitPlan} className="space-y-3.5 rounded-xl border border-border bg-surface p-5 shadow-soft">
          <p className="text-sm font-semibold text-text-1">{t("newPlan")}</p>

          <div className="w-40">
            <label className="mb-1 block text-xs font-medium text-text-2">{t("period")}</label>
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-2 text-sm font-medium text-text-1">
              <IconCalendar size={14} stroke={1.75} className="shrink-0 text-text-3" />
              {period}
            </div>
          </div>

          {hasActivePlanForPeriod && <p className="text-xs text-danger">{t("alreadyHasPlan")}</p>}

          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2">
                <select
                  value={item.kpiIndicatorId}
                  onChange={(e) => updateItem(index, { kpiIndicatorId: e.target.value })}
                  className="min-w-[14rem] flex-1 rounded-lg border border-border bg-bg px-2.5 py-2 text-sm text-text-1 outline-none focus:border-accent"
                >
                  <option value="">{t("selectIndicator")}</option>
                  {allIndicators.map((ind) => (
                    <option key={ind.id} value={ind.id}>
                      {ind.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={item.plannedCount}
                  onChange={(e) => updateItem(index, { plannedCount: e.target.value })}
                  placeholder={t("plannedCount")}
                  className="w-28 rounded-lg border border-border bg-bg px-2.5 py-2 text-sm text-text-1 outline-none focus:border-accent"
                />
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-text-3 transition-colors hover:text-danger"
                  >
                    <IconTrash size={16} stroke={1.75} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1 text-xs font-medium text-accent transition-opacity hover:opacity-75"
            >
              <IconPlus size={13} stroke={2} />
              {t("addItem")}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting || hasActivePlanForPeriod}
              className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-90 active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? t("submitting") : t("submit")}
            </button>
            {plans.length > 0 && (
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-sm font-medium text-text-3 transition-colors hover:text-text-1"
              >
                {t("cancel")}
              </button>
            )}
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-3 text-sm font-medium text-text-3 transition-colors hover:border-accent hover:text-accent"
        >
          <IconPlus size={16} stroke={1.75} />
          {t("newPlan")}
        </button>
      )}
    </div>
  );
}
