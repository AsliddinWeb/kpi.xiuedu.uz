"use client";

import {
  IconAlertTriangle,
  IconBuilding,
  IconBuildingSkyscraper,
  IconLoader2,
  IconTag,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState, type ChangeEvent } from "react";

type CompanyData = { companyName: string; industryLabel: string; logoUrl: string };

type Props = {
  data: CompanyData;
  onChange: (patch: Partial<CompanyData>) => void;
};

const ACCEPTED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

export default function CompanyStep({ data, onChange }: Props) {
  const t = useTranslations("setup.company");
  const locale = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoBroken, setLogoBroken] = useState(false);

  const showLogo = Boolean(data.logoUrl) && !logoBroken;
  const initial = data.companyName.trim().charAt(0).toUpperCase() || null;

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

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/v1/setup/logo", {
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
      const uploaded = await res.json();
      onChange({ logoUrl: uploaded.logo_url ?? "" });
      setLogoBroken(false);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-text-1">{t("heading")}</h2>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-text-2" htmlFor="companyName">
          {t("name")}
        </label>
        <div className="group flex items-center gap-2.5 rounded-xl border border-border bg-bg px-3.5 py-3 transition-all focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft">
          <IconBuildingSkyscraper
            size={17}
            stroke={1.75}
            className="shrink-0 text-text-3 transition-colors group-focus-within:text-accent"
          />
          <input
            id="companyName"
            required
            placeholder={t("namePlaceholder")}
            value={data.companyName}
            onChange={(e) => onChange({ companyName: e.target.value })}
            className="w-full bg-transparent text-sm text-text-1 outline-none placeholder:text-text-3"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-text-2" htmlFor="industryLabel">
          {t("industry")}
        </label>
        <div className="group flex items-center gap-2.5 rounded-xl border border-border bg-bg px-3.5 py-3 transition-all focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft">
          <IconTag
            size={17}
            stroke={1.75}
            className="shrink-0 text-text-3 transition-colors group-focus-within:text-accent"
          />
          <input
            id="industryLabel"
            value={data.industryLabel}
            onChange={(e) => onChange({ industryLabel: e.target.value })}
            placeholder={t("industryPlaceholder")}
            className="w-full bg-transparent text-sm text-text-1 outline-none placeholder:text-text-3"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-text-2" htmlFor="logo-upload">
          {t("logo")}
        </label>
        <div className="flex items-center gap-4">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-bg">
            {uploading ? (
              <IconLoader2 size={18} className="animate-spin text-text-3" />
            ) : showLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.logoUrl}
                alt={data.companyName || "logo"}
                className="h-full w-full object-contain p-1.5"
                onError={() => setLogoBroken(true)}
                onLoad={() => setLogoBroken(false)}
              />
            ) : (
              <span className="text-base font-bold text-text-3">
                {initial ?? <IconBuilding size={18} stroke={1.5} />}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-1 transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
              >
                <IconUpload size={14} stroke={2} />
                {showLogo ? t("logoReplace") : t("logoUpload")}
              </button>
              {showLogo && (
                <button
                  type="button"
                  onClick={() => {
                    onChange({ logoUrl: "" });
                    setLogoBroken(false);
                  }}
                  disabled={uploading}
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
      </div>
    </div>
  );
}
