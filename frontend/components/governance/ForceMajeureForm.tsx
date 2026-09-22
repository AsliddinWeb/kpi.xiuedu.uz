"use client";

import { IconAlertTriangle, IconCalendar, IconCalendarTime, IconCloudStorm, IconMessage2, IconUsersGroup } from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Employee } from "@/lib/employees";
import FormSection from "@/components/ui/FormSection";
import IconField from "@/components/ui/IconField";

const FM_CATEGORIES = [
  "natural_disaster",
  "war_or_unrest",
  "government_restriction",
  "system_outage",
  "utility_outage",
  "health_emergency",
  "other",
] as const;

export default function ForceMajeureForm({ employees }: { employees: Employee[] }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("governance");

  const [userId, setUserId] = useState("");
  const [period, setPeriod] = useState("");
  const [category, setCategory] = useState<(typeof FM_CATEGORIES)[number]>("other");
  const [description, setDescription] = useState("");
  const [extensionDays, setExtensionDays] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedEmployee = employees.find((e) => String(e.id) === userId);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!period || !description) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/force-majeure", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept-Language": locale },
        credentials: "include",
        body: JSON.stringify({
          affected_user_id: userId ? Number(userId) : null,
          period,
          category,
          description,
          extension_days: Number(extensionDays) || 0,
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

      <FormSection icon={IconCloudStorm} title={t("tabs.forceMajeure")}>
        <div className="mb-4 flex items-center gap-3 rounded-lg bg-bg p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <IconCloudStorm size={18} stroke={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-text-1">{selectedEmployee?.full_name ?? t("wholeOrganization")}</p>
            <p className="text-xs text-text-3">{t(`categoryValues.${category}`)}</p>
          </div>
        </div>

        <div className="space-y-4">
          <IconField icon={IconUsersGroup}>
            <select value={userId} onChange={(e) => setUserId(e.target.value)} className="w-full bg-transparent text-sm text-text-1 outline-none">
              <option value="">{t("wholeOrganization")}</option>
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

          <IconField icon={IconCloudStorm}>
            <select value={category} onChange={(e) => setCategory(e.target.value as (typeof FM_CATEGORIES)[number])} className="w-full bg-transparent text-sm text-text-1 outline-none">
              {FM_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`categoryValues.${c}`)}
                </option>
              ))}
            </select>
          </IconField>

          <IconField icon={IconCalendarTime}>
            <input
              type="number"
              min={0}
              value={extensionDays}
              onChange={(e) => setExtensionDays(e.target.value)}
              placeholder={t("extensionDays")}
              className="w-full bg-transparent text-sm text-text-1 outline-none placeholder:text-text-3"
            />
          </IconField>

          <IconField icon={IconMessage2}>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("description")} className="w-full bg-transparent text-sm text-text-1 outline-none placeholder:text-text-3" />
          </IconField>
        </div>
      </FormSection>

      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft">
        <button
          type="submit"
          disabled={submitting || !period || !description}
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-90 active:scale-[0.98] disabled:opacity-50"
        >
          {t("declare")}
        </button>
        <button type="button" onClick={() => router.push("/dashboard/governance")} className="text-sm font-medium text-text-3 transition-colors hover:text-text-1">
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}
