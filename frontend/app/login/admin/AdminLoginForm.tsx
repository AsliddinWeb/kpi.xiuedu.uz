"use client";

import { IconArrowRight, IconEye, IconEyeOff, IconLoader2, IconLock, IconMail, IconShieldLock } from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function AdminLoginForm() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": locale,
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.detail ?? t("genericError"));
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-7 flex animate-fade-up flex-col items-center gap-2 text-center [animation-delay:0ms] lg:items-start lg:text-left">
        <span className="flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent">
          <IconShieldLock size={13} stroke={2} />
          {t("adminBadge")}
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-text-1">{t("adminHeading")}</h1>
        <p className="text-sm text-text-2">{t("adminSubheading")}</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="relative animate-fade-up space-y-5 overflow-hidden rounded-2xl border border-border bg-surface p-7 shadow-soft [animation-delay:60ms]"
      >
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-accent via-[#8b93f5] to-accent" />
        {error && (
          <p className="animate-fade-up rounded-lg border border-danger-soft bg-danger-soft px-3 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}
        <div className="animate-fade-up space-y-1.5 [animation-delay:120ms]">
          <label className="text-xs font-semibold uppercase tracking-wide text-text-3" htmlFor="email">
            {t("email")}
          </label>
          <div className="group flex items-center gap-2.5 rounded-xl border border-border bg-bg px-3.5 py-3 transition-all focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft">
            <IconMail size={18} stroke={1.75} className="shrink-0 text-text-3 transition-colors group-focus-within:text-accent" />
            <input
              id="email"
              type="email"
              required
              autoComplete="username"
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent text-sm text-text-1 outline-none placeholder:text-text-3"
            />
          </div>
        </div>
        <div className="animate-fade-up space-y-1.5 [animation-delay:180ms]">
          <label className="text-xs font-semibold uppercase tracking-wide text-text-3" htmlFor="password">
            {t("password")}
          </label>
          <div className="group flex items-center gap-2.5 rounded-xl border border-border bg-bg px-3.5 py-3 transition-all focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft">
            <IconLock size={18} stroke={1.75} className="shrink-0 text-text-3 transition-colors group-focus-within:text-accent" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder={t("passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent text-sm text-text-1 outline-none placeholder:text-text-3"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t("hidePassword") : t("showPassword")}
              className="shrink-0 text-text-3 transition-colors hover:text-text-1"
            >
              {showPassword ? <IconEyeOff size={18} stroke={1.75} /> : <IconEye size={18} stroke={1.75} />}
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="group flex w-full animate-fade-up items-center justify-center gap-2 rounded-xl bg-accent px-3 py-3 text-sm font-semibold text-white shadow-sm transition-all [animation-delay:240ms] hover:brightness-90 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
        >
          {loading && <IconLoader2 size={17} className="animate-spin" />}
          {loading ? t("submitting") : t("submit")}
          {!loading && (
            <IconArrowRight size={16} stroke={2} className="transition-transform group-hover:translate-x-0.5" />
          )}
        </button>
      </form>
    </div>
  );
}
