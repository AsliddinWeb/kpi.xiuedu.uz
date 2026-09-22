"use client";

import { IconLock, IconMail, IconUser } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

type AdminData = {
  createAdmin: boolean;
  adminEmail: string;
  adminPassword: string;
  adminFullName: string;
};

type Props = {
  data: AdminData;
  onChange: (patch: Partial<AdminData>) => void;
};

export default function AdminStep({ data, onChange }: Props) {
  const t = useTranslations("setup.admin");

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-text-1">{t("heading")}</h2>

      <label className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-alt px-3.5 py-3 text-sm text-text-1">
        <input
          type="checkbox"
          checked={data.createAdmin}
          onChange={(e) => onChange({ createAdmin: e.target.checked })}
          className="mt-0.5 accent-accent"
        />
        <span>{t("createSeparate")}</span>
      </label>

      {!data.createAdmin && <p className="text-sm text-text-2">{t("selfServeNote")}</p>}

      {data.createAdmin && (
        <div className="animate-fade-up space-y-3 border-l-2 border-accent-soft pl-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-2" htmlFor="adminFullName">
              {t("fullName")}
            </label>
            <div className="group flex items-center gap-2.5 rounded-xl border border-border bg-bg px-3.5 py-3 transition-all focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft">
              <IconUser
                size={17}
                stroke={1.75}
                className="shrink-0 text-text-3 transition-colors group-focus-within:text-accent"
              />
              <input
                id="adminFullName"
                placeholder={t("fullNamePlaceholder")}
                value={data.adminFullName}
                onChange={(e) => onChange({ adminFullName: e.target.value })}
                className="w-full bg-transparent text-sm text-text-1 outline-none placeholder:text-text-3"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-2" htmlFor="adminEmail">
              {t("email")}
            </label>
            <div className="group flex items-center gap-2.5 rounded-xl border border-border bg-bg px-3.5 py-3 transition-all focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft">
              <IconMail
                size={17}
                stroke={1.75}
                className="shrink-0 text-text-3 transition-colors group-focus-within:text-accent"
              />
              <input
                id="adminEmail"
                type="email"
                placeholder={t("emailPlaceholder")}
                value={data.adminEmail}
                onChange={(e) => onChange({ adminEmail: e.target.value })}
                className="w-full bg-transparent text-sm text-text-1 outline-none placeholder:text-text-3"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-2" htmlFor="adminPassword">
              {t("password")}
            </label>
            <div className="group flex items-center gap-2.5 rounded-xl border border-border bg-bg px-3.5 py-3 transition-all focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft">
              <IconLock
                size={17}
                stroke={1.75}
                className="shrink-0 text-text-3 transition-colors group-focus-within:text-accent"
              />
              <input
                id="adminPassword"
                type="password"
                placeholder={t("passwordPlaceholder")}
                value={data.adminPassword}
                onChange={(e) => onChange({ adminPassword: e.target.value })}
                className="w-full bg-transparent text-sm text-text-1 outline-none placeholder:text-text-3"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
