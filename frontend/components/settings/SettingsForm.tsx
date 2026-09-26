"use client";

import {
  IconAlertTriangle,
  IconBuilding,
  IconCalendarMonth,
  IconCalendarStats,
  IconCalendarWeek,
  IconCheck,
  IconCircleCheck,
  IconLoader2,
  IconPhotoUp,
  IconSettings,
  IconTag,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import type { CompanySettings } from "@/lib/company";
import FormSection from "@/components/ui/FormSection";
import IconField from "@/components/ui/IconField";

type PeriodType = "monthly" | "quarterly" | "yearly";
const PERIOD_OPTIONS: { value: PeriodType; icon: typeof IconCalendarMonth }[] = [
  { value: "monthly", icon: IconCalendarWeek },
  { value: "quarterly", icon: IconCalendarMonth },
  { value: "yearly", icon: IconCalendarStats },
];

const ACCEPTED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const ACCEPTED_COVER_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_COVER_BYTES = 8 * 1024 * 1024;

export default function SettingsForm({ company }: { company: CompanySettings }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("settings");
  const tp = useTranslations("setup.period");
  const [name, setName] = useState(company.name);
  const [industryLabel, setIndustryLabel] = useState(company.industry_label ?? "");
  const [logoUrl, setLogoUrl] = useState(company.logo_url ?? "");
  const [logoBroken, setLogoBroken] = useState(false);
  const [periodType, setPeriodType] = useState<PeriodType>(company.default_period_type);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [coverImageUrl, setCoverImageUrl] = useState(company.cover_image_url ?? "");
  const [coverBroken, setCoverBroken] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/v1/setup/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Accept-Language": locale },
        credentials: "include",
        body: JSON.stringify({
          name,
          industry_label: industryLabel || null,
          default_period_type: periodType,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.detail ?? t("genericError"));
        return;
      }
      setSavedAt(Date.now());
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setLogoError(null);
    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      setLogoError(t("logoInvalidType"));
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError(t("logoTooLarge"));
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/v1/setup/company/logo", {
        method: "POST",
        headers: { "Accept-Language": locale },
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setLogoError(body?.detail ?? t("genericError"));
        return;
      }
      const updated = await res.json();
      setLogoUrl(updated.logo_url ?? "");
      setLogoBroken(false);
      router.refresh();
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleRemoveLogo() {
    setLogoError(null);
    setUploadingLogo(true);
    try {
      const res = await fetch("/api/v1/setup/company/logo", {
        method: "DELETE",
        headers: { "Accept-Language": locale },
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setLogoError(body?.detail ?? t("genericError"));
        return;
      }
      setLogoUrl("");
      setLogoBroken(false);
      router.refresh();
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleCoverFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setCoverError(null);
    if (!ACCEPTED_COVER_TYPES.includes(file.type)) {
      setCoverError(t("coverInvalidType"));
      return;
    }
    if (file.size > MAX_COVER_BYTES) {
      setCoverError(t("coverTooLarge"));
      return;
    }

    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/v1/setup/company/cover-image", {
        method: "POST",
        headers: { "Accept-Language": locale },
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setCoverError(body?.detail ?? t("genericError"));
        return;
      }
      const updated = await res.json();
      setCoverImageUrl(updated.cover_image_url ?? "");
      setCoverBroken(false);
      router.refresh();
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleRemoveCover() {
    setCoverError(null);
    setUploadingCover(true);
    try {
      const res = await fetch("/api/v1/setup/company/cover-image", {
        method: "DELETE",
        headers: { "Accept-Language": locale },
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setCoverError(body?.detail ?? t("genericError"));
        return;
      }
      setCoverImageUrl("");
      setCoverBroken(false);
      router.refresh();
    } finally {
      setUploadingCover(false);
    }
  }

  const initial = name.trim() ? name.trim().charAt(0).toUpperCase() : null;
  const showLogo = Boolean(logoUrl) && !logoBroken;
  const showCover = Boolean(coverImageUrl) && !coverBroken;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px] lg:items-start">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <p className="flex items-center gap-2 rounded-lg border border-danger-soft bg-danger-soft px-3 py-2.5 text-sm text-danger">
            <IconAlertTriangle size={16} stroke={1.75} className="shrink-0" />
            {error}
          </p>
        )}
        {savedAt && !error && (
          <p className="flex items-center gap-2 rounded-lg border border-success-soft bg-success-soft px-3 py-2.5 text-sm text-success">
            <IconCircleCheck size={16} stroke={1.75} className="shrink-0" />
            {t("saved")}
          </p>
        )}

        <FormSection icon={IconBuilding} title={t("companySection")}>
          <div className="space-y-4">
            <Field label={t("logo")} htmlFor="logo-upload">
              <div className="flex items-center gap-4">
                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-bg">
                  {uploadingLogo ? (
                    <IconLoader2 size={20} className="animate-spin text-text-3" />
                  ) : showLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoUrl}
                      alt={name || "logo"}
                      className="h-full w-full object-contain p-1.5"
                      onError={() => setLogoBroken(true)}
                      onLoad={() => setLogoBroken(false)}
                    />
                  ) : (
                    <span className="text-lg font-bold text-text-3">{initial ?? <IconBuilding size={20} stroke={1.5} />}</span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-1 transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
                    >
                      <IconUpload size={14} stroke={2} />
                      {showLogo ? t("logoReplace") : t("logoUpload")}
                    </button>
                    {showLogo && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        disabled={uploadingLogo}
                        className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-danger transition-colors hover:border-danger disabled:opacity-50"
                      >
                        <IconTrash size={14} stroke={2} />
                        {t("logoRemove")}
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-text-3">{t("logoHint")}</p>
                  {logoError && (
                    <p className="flex items-center gap-1.5 text-xs text-danger">
                      <IconAlertTriangle size={12} stroke={1.75} />
                      {logoError}
                    </p>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  id="logo-upload"
                  type="file"
                  accept={ACCEPTED_LOGO_TYPES.join(",")}
                  onChange={handleLogoFile}
                  className="hidden"
                />
              </div>
            </Field>

            <Field label={t("coverImage")} htmlFor="cover-upload">
              <div className="space-y-2">
                <div className="relative flex h-28 w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-bg sm:w-56">
                  {uploadingCover ? (
                    <IconLoader2 size={20} className="animate-spin text-text-3" />
                  ) : showCover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverImageUrl}
                      alt={t("coverImage")}
                      className="h-full w-full object-cover"
                      onError={() => setCoverBroken(true)}
                      onLoad={() => setCoverBroken(false)}
                    />
                  ) : (
                    <IconPhotoUp size={22} stroke={1.5} className="text-text-3" />
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={uploadingCover}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-1 transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
                  >
                    <IconUpload size={14} stroke={2} />
                    {showCover ? t("logoReplace") : t("logoUpload")}
                  </button>
                  {showCover && (
                    <button
                      type="button"
                      onClick={handleRemoveCover}
                      disabled={uploadingCover}
                      className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-danger transition-colors hover:border-danger disabled:opacity-50"
                    >
                      <IconTrash size={14} stroke={2} />
                      {t("logoRemove")}
                    </button>
                  )}
                </div>
                <p className="text-xs text-text-3">{t("coverHint")}</p>
                {coverError && (
                  <p className="flex items-center gap-1.5 text-xs text-danger">
                    <IconAlertTriangle size={12} stroke={1.75} />
                    {coverError}
                  </p>
                )}
                <input
                  ref={coverInputRef}
                  id="cover-upload"
                  type="file"
                  accept={ACCEPTED_COVER_TYPES.join(",")}
                  onChange={handleCoverFile}
                  className="hidden"
                />
              </div>
            </Field>

            <Field label={t("name")} htmlFor="name">
              <IconField icon={IconBuilding}>
                <input
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-transparent text-sm text-text-1 outline-none"
                />
              </IconField>
            </Field>

            <Field label={t("industry")} htmlFor="industryLabel">
              <IconField icon={IconTag}>
                <input
                  id="industryLabel"
                  value={industryLabel}
                  onChange={(e) => setIndustryLabel(e.target.value)}
                  className="w-full bg-transparent text-sm text-text-1 outline-none"
                />
              </IconField>
            </Field>
          </div>
        </FormSection>

        <FormSection icon={IconSettings} title={t("evaluationSection")}>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-2">{t("period")}</label>
            <div className="flex flex-wrap gap-2">
              {PERIOD_OPTIONS.map(({ value, icon: Icon }) => {
                const active = periodType === value;
                return (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setPeriodType(value)}
                    className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                      active ? "bg-accent text-white shadow-sm" : "bg-surface-alt text-text-2 hover:text-text-1"
                    }`}
                  >
                    <Icon size={16} stroke={1.75} />
                    {tp(value)}
                    {active && <IconCheck size={14} stroke={2.25} />}
                  </button>
                );
              })}
            </div>
          </div>
        </FormSection>

        <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-90 active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? t("saving") : t("save")}
          </button>
        </div>
      </form>

      <div className="lg:sticky lg:top-20">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-3">
            <IconPhotoUp size={14} stroke={1.75} />
            {t("previewTitle")}
          </p>
          <p className="mb-4 text-xs text-text-3">{t("previewHint")}</p>

          <div className="space-y-3">
            <div className="flex items-center gap-2.5 rounded-xl bg-sidebar-bg-2 p-3.5 shadow-[0_4px_16px_-6px_rgba(0,0,0,0.45)]">
              {showLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={name} className="h-9 w-9 shrink-0 rounded-lg border border-white/20 bg-white/95 object-contain p-1" />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sidebar-accent to-accent text-sm font-bold text-white">
                  {initial ?? "?"}
                </div>
              )}
              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight text-white">
                {name.trim() || t("name")}
              </span>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-border bg-bg p-3">
              {showLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={name} className="h-8 w-8 shrink-0 rounded-lg border border-border bg-white object-contain p-1" />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-[#3646c9] text-sm font-bold text-white">
                  {initial ?? "?"}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text-1">{name.trim() || t("name")}</p>
                <p className="truncate text-xs text-text-3">{industryLabel.trim() || t("industry")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-text-2" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}
