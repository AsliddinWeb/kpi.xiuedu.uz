"use client";

import { IconBuildingSkyscraper, IconLink, IconTag } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

type CompanyData = { companyName: string; industryLabel: string; logoUrl: string };

type Props = {
  data: CompanyData;
  onChange: (patch: Partial<CompanyData>) => void;
};

export default function CompanyStep({ data, onChange }: Props) {
  const t = useTranslations("setup.company");

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
        <label className="text-sm font-medium text-text-2" htmlFor="logoUrl">
          {t("logo")}
        </label>
        <div className="group flex items-center gap-2.5 rounded-xl border border-border bg-bg px-3.5 py-3 transition-all focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft">
          <IconLink
            size={17}
            stroke={1.75}
            className="shrink-0 text-text-3 transition-colors group-focus-within:text-accent"
          />
          <input
            id="logoUrl"
            value={data.logoUrl}
            onChange={(e) => onChange({ logoUrl: e.target.value })}
            placeholder={t("logoPlaceholder")}
            className="w-full bg-transparent text-sm text-text-1 outline-none placeholder:text-text-3"
          />
        </div>
      </div>
    </div>
  );
}
