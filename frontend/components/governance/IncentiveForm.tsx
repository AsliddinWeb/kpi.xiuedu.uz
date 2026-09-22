"use client";

import { IconAlertTriangle, IconCalendar, IconCertificate, IconCoin, IconGift, IconMessage2, IconPlane, IconTag, IconUser } from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Employee } from "@/lib/employees";
import FormSection from "@/components/ui/FormSection";
import IconField from "@/components/ui/IconField";

const INCENTIVE_TYPES = ["monetary", "title", "certificate", "training_trip", "other"] as const;

const INCENTIVE_TYPE_ICON: Record<(typeof INCENTIVE_TYPES)[number], typeof IconCoin> = {
  monetary: IconCoin,
  title: IconTag,
  certificate: IconCertificate,
  training_trip: IconPlane,
  other: IconGift,
};

export default function IncentiveForm({ employees }: { employees: Employee[] }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("governance");

  const [userId, setUserId] = useState("");
  const [period, setPeriod] = useState("");
  const [type, setType] = useState<(typeof INCENTIVE_TYPES)[number]>("title");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedEmployee = employees.find((e) => String(e.id) === userId);
  const TypeIcon = INCENTIVE_TYPE_ICON[type];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!userId || !period || !title) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/incentives", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept-Language": locale },
        credentials: "include",
        body: JSON.stringify({
          user_id: Number(userId),
          period,
          type,
          title,
          description: description.trim() || null,
          amount: type === "monetary" ? Number(amount) || 0 : null,
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

      <FormSection icon={IconGift} title={t("tabs.incentives")}>
        <div className="mb-4 flex items-center gap-3 rounded-lg bg-bg p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-sm font-bold text-accent">
            {selectedEmployee ? selectedEmployee.full_name.charAt(0).toUpperCase() : <IconUser size={18} stroke={1.75} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-text-1">{selectedEmployee?.full_name ?? t("selectEmployee")}</p>
            <span className="mt-0.5 flex w-fit items-center gap-1 rounded-full bg-surface-alt px-2 py-0.5 text-[0.65rem] font-semibold text-text-2">
              <TypeIcon size={11} stroke={1.75} />
              {title.trim() || t(`typeValues.${type}`)}
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
            {INCENTIVE_TYPES.map((ty) => {
              const Icon = INCENTIVE_TYPE_ICON[ty];
              const active = type === ty;
              return (
                <button
                  key={ty}
                  type="button"
                  onClick={() => setType(ty)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active ? "bg-accent-soft text-accent" : "bg-surface-alt text-text-3 hover:text-text-1"
                  }`}
                >
                  <Icon size={13} stroke={1.75} />
                  {t(`typeValues.${ty}`)}
                </button>
              );
            })}
          </div>

          <IconField icon={IconTag}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("title")} className="w-full bg-transparent text-sm text-text-1 outline-none placeholder:text-text-3" />
          </IconField>

          {type === "monetary" && (
            <IconField icon={IconCoin}>
              <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t("amount")} className="w-full bg-transparent text-sm text-text-1 outline-none placeholder:text-text-3" />
            </IconField>
          )}

          <IconField icon={IconMessage2}>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("description")} className="w-full bg-transparent text-sm text-text-1 outline-none placeholder:text-text-3" />
          </IconField>
        </div>
      </FormSection>

      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft">
        <button
          type="submit"
          disabled={submitting || !userId || !period || !title}
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
