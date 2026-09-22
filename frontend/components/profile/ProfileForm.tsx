"use client";

import {
  IconAlertTriangle,
  IconCertificate,
  IconCircleCheck,
  IconEye,
  IconEyeOff,
  IconIdBadge2,
  IconLock,
  IconMail,
  IconShieldLock,
  IconUser,
} from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Me } from "@/lib/auth";
import FormSection from "@/components/ui/FormSection";
import IconField from "@/components/ui/IconField";

export default function ProfileForm({ user }: { user: Me }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("profile");
  const roleT = useTranslations("roles");

  const [fullName, setFullName] = useState(user.full_name);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordChanged, setPasswordChanged] = useState(false);

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSaved(false);
    setSavingProfile(true);
    try {
      const res = await fetch("/api/v1/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Accept-Language": locale },
        credentials: "include",
        body: JSON.stringify({ full_name: fullName.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setProfileError(body?.detail ?? t("genericError"));
        return;
      }
      setProfileSaved(true);
      router.refresh();
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordChanged(false);

    if (newPassword.length < 8) {
      setPasswordError(t("passwordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("passwordMismatch"));
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch("/api/v1/users/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Accept-Language": locale },
        credentials: "include",
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setPasswordError(body?.detail ?? t("genericError"));
        return;
      }
      setPasswordChanged(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <div className="space-y-5">
      <FormSection icon={IconIdBadge2} title={t("personalInfoSection")}>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          {profileError && (
            <p className="flex items-center gap-2 rounded-lg border border-danger-soft bg-danger-soft px-3 py-2.5 text-sm text-danger">
              <IconAlertTriangle size={16} stroke={1.75} className="shrink-0" />
              {profileError}
            </p>
          )}
          {profileSaved && !profileError && (
            <p className="flex items-center gap-2 rounded-lg border border-success-soft bg-success-soft px-3 py-2.5 text-sm text-success">
              <IconCircleCheck size={16} stroke={1.75} className="shrink-0" />
              {t("savedProfile")}
            </p>
          )}

          <div className="mb-4 flex items-center gap-3 rounded-lg bg-bg p-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-lg font-bold text-accent">
              {fullName.trim() ? fullName.trim().charAt(0).toUpperCase() : <IconUser size={20} stroke={1.75} />}
            </div>
            <div>
              <p className="text-sm font-semibold text-text-1">{fullName.trim() || t("fullName")}</p>
              <p className="text-xs text-text-3">{roleT(user.role)}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-2">{t("fullName")}</label>
              <IconField icon={IconUser}>
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-transparent text-sm text-text-1 outline-none"
                />
              </IconField>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-2">{t("email")}</label>
              <IconField icon={IconMail}>
                <input
                  disabled
                  value={user.email}
                  className="w-full bg-transparent text-sm text-text-3 outline-none"
                />
              </IconField>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-2">{t("academicDegree")}</label>
              <IconField icon={IconCertificate}>
                <input
                  disabled
                  value={t(`academicDegreeValues.${user.academic_degree}`)}
                  className="w-full bg-transparent text-sm text-text-3 outline-none"
                />
              </IconField>
              <p className="text-xs text-text-3">{t("academicDegreeHint")}</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingProfile || !fullName.trim()}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-90 active:scale-[0.98] disabled:opacity-50"
          >
            {savingProfile ? t("saving") : t("save")}
          </button>
        </form>
      </FormSection>

      <FormSection icon={IconShieldLock} title={t("passwordSection")}>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {passwordError && (
            <p className="flex items-center gap-2 rounded-lg border border-danger-soft bg-danger-soft px-3 py-2.5 text-sm text-danger">
              <IconAlertTriangle size={16} stroke={1.75} className="shrink-0" />
              {passwordError}
            </p>
          )}
          {passwordChanged && !passwordError && (
            <p className="flex items-center gap-2 rounded-lg border border-success-soft bg-success-soft px-3 py-2.5 text-sm text-success">
              <IconCircleCheck size={16} stroke={1.75} className="shrink-0" />
              {t("passwordChanged")}
            </p>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-2">{t("currentPassword")}</label>
            <PasswordField
              value={currentPassword}
              onChange={setCurrentPassword}
              visible={showPasswords}
              autoComplete="current-password"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-2">{t("newPassword")}</label>
              <PasswordField
                value={newPassword}
                onChange={setNewPassword}
                visible={showPasswords}
                autoComplete="new-password"
                onToggle={() => setShowPasswords((v) => !v)}
                toggleLabel={showPasswords ? t("hidePassword") : t("showPassword")}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-2">{t("confirmPassword")}</label>
              <PasswordField
                value={confirmPassword}
                onChange={setConfirmPassword}
                visible={showPasswords}
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-90 active:scale-[0.98] disabled:opacity-50"
          >
            {changingPassword ? t("changingPassword") : t("changePassword")}
          </button>
        </form>
      </FormSection>
    </div>
  );
}

function PasswordField({
  value,
  onChange,
  visible,
  autoComplete,
  onToggle,
  toggleLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  visible: boolean;
  autoComplete: string;
  onToggle?: () => void;
  toggleLabel?: string;
}) {
  return (
    <div className="group flex items-center gap-2 rounded-xl border border-border bg-bg px-3.5 py-2.5 transition-all focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft">
      <IconLock size={16} stroke={1.75} className="shrink-0 text-text-3 transition-colors group-focus-within:text-accent" />
      <input
        required
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-sm text-text-1 outline-none"
      />
      {onToggle && (
        <button type="button" onClick={onToggle} aria-label={toggleLabel} className="shrink-0 text-text-3 hover:text-text-1">
          {visible ? <IconEyeOff size={16} stroke={1.75} /> : <IconEye size={16} stroke={1.75} />}
        </button>
      )}
    </div>
  );
}
