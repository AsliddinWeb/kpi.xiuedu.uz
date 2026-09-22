"use client";

import { IconCheck } from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AdminStep from "@/components/setup/AdminStep";
import CompanyStep from "@/components/setup/CompanyStep";
import DepartmentsStep, { type DepartmentDraft } from "@/components/setup/DepartmentsStep";
import PeriodStep, { type PeriodType } from "@/components/setup/PeriodStep";

type WizardState = {
  companyName: string;
  industryLabel: string;
  logoUrl: string;
  departments: DepartmentDraft[];
  periodType: PeriodType;
  createAdmin: boolean;
  adminEmail: string;
  adminPassword: string;
  adminFullName: string;
};

const STEPS = ["company", "departments", "period", "admin"] as const;

export default function SetupWizard() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("setup");
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<WizardState>({
    companyName: "",
    industryLabel: "",
    logoUrl: "",
    departments: [{ name: "", positions: [""] }],
    periodType: "monthly",
    createAdmin: false,
    adminEmail: "",
    adminPassword: "",
    adminFullName: "",
  });

  function update(patch: Partial<WizardState>) {
    setData((prev) => ({ ...prev, ...patch }));
  }

  function canGoNext(): boolean {
    if (step === 0) return data.companyName.trim().length > 0;
    if (step === 1) return data.departments.some((d) => d.name.trim().length > 0);
    return true;
  }

  async function handleFinish() {
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        company_name: data.companyName.trim(),
        industry_label: data.industryLabel.trim() || null,
        logo_url: data.logoUrl.trim() || null,
        default_period_type: data.periodType,
        departments: data.departments
          .filter((d) => d.name.trim().length > 0)
          .map((d) => ({
            name: d.name.trim(),
            positions: d.positions.filter((p) => p.trim().length > 0).map((title) => ({ title: title.trim() })),
          })),
        admin: data.createAdmin
          ? {
              email: data.adminEmail.trim(),
              password: data.adminPassword,
              full_name: data.adminFullName.trim(),
            }
          : null,
      };

      const res = await fetch("/api/v1/setup/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept-Language": locale },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.detail ?? t("genericError"));
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-xl">
      <div className="mb-8 animate-fade-up text-center [animation-delay:0ms]">
        <h1 className="text-2xl font-semibold tracking-tight text-text-1">{t("title")}</h1>
        <p className="mt-1.5 text-sm text-text-2">{t("subtitle")}</p>
      </div>

      <div className="mb-8 flex animate-fade-up items-center [animation-delay:80ms]">
        {STEPS.map((s, i) => {
          const completed = i < step;
          const current = i === step;
          return (
            <div key={s} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={[
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-200",
                    completed
                      ? "bg-accent text-white"
                      : current
                        ? "bg-accent-soft text-accent ring-2 ring-accent ring-offset-2 ring-offset-bg"
                        : "border border-border bg-surface text-text-3",
                  ].join(" ")}
                >
                  {completed ? <IconCheck size={15} stroke={2.5} /> : i + 1}
                </div>
                <span
                  className={`whitespace-nowrap text-[11px] font-medium ${current ? "text-text-1" : "text-text-3"}`}
                >
                  {t(`steps.${s}`)}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`mx-2 h-px flex-1 transition-colors duration-200 ${completed ? "bg-accent" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="relative animate-fade-up overflow-hidden rounded-xl border border-border bg-surface p-6 shadow-soft [animation-delay:150ms]">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-accent via-[#8b93f5] to-accent" />
        {error && (
          <p className="mb-4 rounded-lg border border-danger-soft bg-danger-soft px-3 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}

        <div key={step} className="animate-fade-up">
          {step === 0 && <CompanyStep data={data} onChange={update} />}
          {step === 1 && <DepartmentsStep data={data} onChange={update} />}
          {step === 2 && <PeriodStep data={data} onChange={update} />}
          {step === 3 && <AdminStep data={data} onChange={update} />}
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || submitting}
            className="rounded-lg px-4 py-2 text-sm font-medium text-text-2 transition-colors hover:bg-surface-alt hover:text-text-1 disabled:opacity-40"
          >
            {t("back")}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              disabled={!canGoNext()}
              className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:brightness-90 disabled:opacity-50"
            >
              {t("next")}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={submitting}
              className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:brightness-90 disabled:opacity-50"
            >
              {submitting ? t("finishing") : t("finish")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
