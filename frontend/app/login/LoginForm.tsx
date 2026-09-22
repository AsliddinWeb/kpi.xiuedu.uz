"use client";

import { IconArrowRight, IconSchool, IconShieldCheck } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

const HEMIS_ERROR_KEYS: Record<string, string> = {
  hemis_denied: "hemisErrors.denied",
  hemis_state: "hemisErrors.state",
  hemis_failed: "hemisErrors.failed",
  hemis_inactive: "hemisErrors.inactive",
};

export default function LoginForm({ hemisError }: { hemisError?: string }) {
  const t = useTranslations("login");
  const [error] = useState<string | null>(
    hemisError ? t(HEMIS_ERROR_KEYS[hemisError] ?? "hemisErrors.failed") : null,
  );

  return (
    <div className="w-full max-w-sm">
      <div className="mb-7 animate-fade-up text-center [animation-delay:0ms] lg:text-left">
        <h1 className="text-2xl font-semibold tracking-tight text-text-1">{t("heading")}</h1>
        <p className="mt-1.5 text-sm text-text-2">{t("subheadingHemis")}</p>
      </div>

      <div className="relative animate-fade-up space-y-5 overflow-hidden rounded-2xl border border-border bg-surface p-7 shadow-soft [animation-delay:60ms]">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-accent via-[#8b93f5] to-accent" />
        {error && (
          <p className="animate-fade-up rounded-lg border border-danger-soft bg-danger-soft px-3 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sidebar-bg-2 to-sidebar-bg text-white shadow-soft">
            <IconSchool size={26} stroke={1.5} />
          </div>
          <p className="text-sm text-text-2">{t("hemisIntro")}</p>
        </div>

        <a
          href="/api/v1/auth/hemis/login"
          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-sidebar-bg-2 to-sidebar-bg px-3 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 active:scale-[0.98]"
        >
          <IconSchool size={18} stroke={1.75} />
          {t("hemisLogin")}
          <IconArrowRight size={16} stroke={2} className="transition-transform group-hover:translate-x-0.5" />
        </a>

        <p className="flex items-center justify-center gap-1.5 text-xs text-text-3">
          <IconShieldCheck size={14} stroke={1.75} className="shrink-0" />
          {t("hemisHint")}
        </p>
      </div>
    </div>
  );
}
