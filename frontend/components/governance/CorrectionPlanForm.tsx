"use client";

import { IconAlertTriangle, IconCalendar, IconClipboardText, IconMessage2, IconTrendingDown, IconUser, IconUserX } from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Employee } from "@/lib/employees";
import FormSection from "@/components/ui/FormSection";
import IconField from "@/components/ui/IconField";

const STAGES = ["load_reduction", "warning", "termination"] as const;

const STAGE_META: Record<(typeof STAGES)[number], { icon: typeof IconTrendingDown; tone: string }> = {
  load_reduction: { icon: IconTrendingDown, tone: "bg-warning-soft text-warning" },
  warning: { icon: IconAlertTriangle, tone: "bg-warning-soft text-warning" },
  termination: { icon: IconUserX, tone: "bg-danger-soft text-danger" },
};

export default function CorrectionPlanForm({ employees }: { employees: Employee[] }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("governance");

  const [userId, setUserId] = useState("");
  const [period, setPeriod] = useState("");
  const [stage, setStage] = useState<(typeof STAGES)[number]>("warning");
  const [reason, setReason] = useState("");
  const [loadReduction, setLoadReduction] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedEmployee = employees.find((e) => String(e.id) === userId);
  const stageMeta = STAGE_META[stage];
  const StageIcon = stageMeta.icon;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!userId || !period || !reason) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/correction-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept-Language": locale },
        credentials: "include",
        body: JSON.stringify({
          user_id: Number(userId),
          period,
          stage,
          reason,
          load_reduction_percent: stage === "load_reduction" ? Number(loadReduction) || 0 : null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.detail ?? t("genericError"));
        return;
      }
      router.push("/dashboard/governance");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-5">
      {error && (
        <p className="flex items-center gap-2 rounded-lg border border-danger-soft bg-danger-soft px-3 py-2.5 text-sm text-danger">
          <IconAlertTriangle size={16} stroke={1.75} className="shrink-0" />
          {error}
        </p>
      )}

      <FormSection icon={IconClipboardText} title={t("tabs.correctionPlans")}>
        <div className="mb-4 flex items-center gap-3 rounded-lg bg-bg p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-sm font-bold text-accent">
            {selectedEmployee ? selectedEmployee.full_name.charAt(0).toUpperCase() : <IconUser size={18} stroke={1.75} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-text-1">{selectedEmployee?.full_name ?? t("selectEmployee")}</p>
            <span className={`mt-0.5 flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${stageMeta.tone}`}>
              <StageIcon size={11} stroke={2} />
              {t(`stageValues.${stage}`)}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <IconField icon={IconUser}>
            <select value={userId} onChange={(e) => setUserId(e.target.value)} className="w-full bg-transparent text-sm text-text-1 outline-none">
              <option value="">{t("selectEmployee")}</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name}
                </option>
              ))}
            </select>
          </IconField>

          <IconField icon={IconCalendar}>
            <input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-2027" className="w-full bg-transparent text-sm text-text-1 outline-none placeholder:text-text-3" />
          </IconField>

          <div className="flex flex-wrap gap-2">
            {STAGES.map((s) => {
              const meta = STAGE_META[s];
              const Icon = meta.icon;
              const active = stage === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStage(s)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active ? meta.tone : "bg-surface-alt text-text-3 hover:text-text-1"
                  }`}
                >
                  <Icon size={13} stroke={2} />
                  {t(`stageValues.${s}`)}
                </button>
              );
            })}
          </div>

          {stage === "load_reduction" && (
            <IconField icon={IconTrendingDown}>
              <input
                type="number"
                min={0}
                max={100}
                value={loadReduction}
                onChange={(e) => setLoadReduction(e.target.value)}
                placeholder={t("loadReductionPercent")}
                className="w-full bg-transparent text-sm text-text-1 outline-none placeholder:text-text-3"
              />
            </IconField>
          )}

          <IconField icon={IconMessage2}>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("reason")} className="w-full bg-transparent text-sm text-text-1 outline-none placeholder:text-text-3" />
          </IconField>
        </div>
      </FormSection>

      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft">
        <button
          type="submit"
          disabled={submitting || !userId || !period || !reason}
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-90 active:scale-[0.98] disabled:opacity-50"
        >
          {t("create")}
        </button>
        <button type="button" onClick={() => router.push("/dashboard/governance")} className="text-sm font-medium text-text-3 transition-colors hover:text-text-1">
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}
