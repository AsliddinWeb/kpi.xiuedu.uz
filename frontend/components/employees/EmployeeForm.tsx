"use client";

import {
  IconAlertTriangle,
  IconBriefcase,
  IconBuilding,
  IconCertificate,
  IconCoins,
  IconEye,
  IconEyeOff,
  IconIdBadge2,
  IconLock,
  IconMail,
  IconStack3,
  IconUser,
  IconUserCog,
  IconUsersGroup,
} from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import type { Department } from "@/lib/departments";
import type { AcademicDegree, Employee } from "@/lib/employees";
import type { KpiTemplate } from "@/lib/kpiTemplates";
import FormSection from "@/components/ui/FormSection";
import IconField from "@/components/ui/IconField";

const PRIVILEGED_ROLE_OPTIONS = ["admin", "rector", "prorektor_birinchi", "prorektor_oquv", "prorektor_xalqaro"] as const;
type EmployeeRole = "employee" | "manager" | (typeof PRIVILEGED_ROLE_OPTIONS)[number];

export default function EmployeeForm({
  mode,
  employee,
  employees,
  departments,
  kpiTemplates,
  viewerRole,
}: {
  mode: "create" | "edit";
  employee: Employee | null;
  employees: Employee[];
  departments: Department[];
  kpiTemplates: KpiTemplate[];
  viewerRole: string;
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("employees");
  const roleT = useTranslations("roles");

  const canAssignPrivilegedRoles = viewerRole === "super_admin";

  const [email, setEmail] = useState(employee?.email ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState(employee?.full_name ?? "");
  const [role, setRole] = useState<EmployeeRole>((employee?.role as EmployeeRole) ?? "employee");
  const [departmentId, setDepartmentId] = useState(employee?.department_id ? String(employee.department_id) : "");
  const [positionId, setPositionId] = useState(employee?.position_id ? String(employee.position_id) : "");
  const [managerId, setManagerId] = useState(employee?.manager_id ? String(employee.manager_id) : "");
  const [kpiTemplateId, setKpiTemplateId] = useState(employee?.kpi_template_id ? String(employee.kpi_template_id) : "");
  const [academicDegree, setAcademicDegree] = useState<AcademicDegree>(employee?.academic_degree ?? "none");
  const [bonusFundOverride, setBonusFundOverride] = useState(
    employee?.bonus_fund_override != null ? String(employee.bonus_fund_override) : "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const managers = employees.filter((e) => ["manager", "admin", "super_admin"].includes(e.role) && e.id !== employee?.id);
  const selectedDepartment = departments.find((d) => String(d.id) === departmentId);
  const selectedTemplate = kpiTemplates.find((tpl) => String(tpl.id) === kpiTemplateId);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const sharedFields = {
        department_id: departmentId ? Number(departmentId) : null,
        position_id: positionId ? Number(positionId) : null,
        manager_id: managerId ? Number(managerId) : null,
        kpi_template_id: kpiTemplateId ? Number(kpiTemplateId) : null,
        academic_degree: academicDegree,
        bonus_fund_override: bonusFundOverride ? Number(bonusFundOverride) : null,
      };
      const res =
        mode === "create"
          ? await fetch("/api/v1/users", {
              method: "POST",
              headers: { "Content-Type": "application/json", "Accept-Language": locale },
              credentials: "include",
              body: JSON.stringify({
                email: email.trim(),
                password,
                full_name: fullName.trim(),
                role,
                ...sharedFields,
              }),
            })
          : await fetch(`/api/v1/users/${employee!.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json", "Accept-Language": locale },
              credentials: "include",
              body: JSON.stringify({
                full_name: fullName.trim(),
                role,
                ...sharedFields,
              }),
            });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.detail ?? t("genericError"));
        return;
      }
      router.push("/dashboard/employees");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      {error && (
        <p className="flex items-center gap-2 rounded-lg border border-danger-soft bg-danger-soft px-3 py-2.5 text-sm text-danger">
          <IconAlertTriangle size={16} stroke={1.75} className="shrink-0" />
          {error}
        </p>
      )}

      <FormSection icon={IconIdBadge2} title={t("accountInfo")}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-lg font-bold text-accent">
            {fullName.trim() ? fullName.trim().charAt(0).toUpperCase() : <IconUser size={20} stroke={1.75} />}
          </div>
          <div>
            <p className="text-sm font-semibold text-text-1">{fullName.trim() || t("fullName")}</p>
            <p className="text-xs text-text-3">{roleT(role)}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("email")}>
            <IconField icon={IconMail}>
              <input
                required
                type="email"
                disabled={mode === "edit"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-sm text-text-1 outline-none disabled:text-text-3"
              />
            </IconField>
          </Field>

          {mode === "create" && (
            <Field label={t("password")}>
              <div className="group flex items-center gap-2 rounded-xl border border-border bg-bg px-3.5 py-2.5 transition-all focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft">
                <IconLock size={16} stroke={1.75} className="shrink-0 text-text-3 transition-colors group-focus-within:text-accent" />
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent text-sm text-text-1 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                  className="shrink-0 text-text-3 hover:text-text-1"
                >
                  {showPassword ? <IconEyeOff size={16} stroke={1.75} /> : <IconEye size={16} stroke={1.75} />}
                </button>
              </div>
            </Field>
          )}

          <Field label={t("fullName")}>
            <IconField icon={IconUser}>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-transparent text-sm text-text-1 outline-none"
              />
            </IconField>
          </Field>

          <Field label={t("role")}>
            <IconField icon={IconUsersGroup}>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as EmployeeRole)}
                className="w-full bg-transparent text-sm text-text-1 outline-none"
              >
                <option value="employee">{roleT("employee")}</option>
                <option value="manager">{roleT("manager")}</option>
                {canAssignPrivilegedRoles &&
                  PRIVILEGED_ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {roleT(r)}
                    </option>
                  ))}
              </select>
            </IconField>
          </Field>
        </div>
      </FormSection>

      <FormSection icon={IconUserCog} title={t("organizationInfo")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("department")}>
            <IconField icon={IconBuilding}>
              <select
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  setPositionId("");
                }}
                className="w-full bg-transparent text-sm text-text-1 outline-none"
              >
                <option value="">{t("noDepartment")}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </IconField>
          </Field>

          <Field label={t("position")}>
            <IconField icon={IconBriefcase}>
              <select
                value={positionId}
                onChange={(e) => setPositionId(e.target.value)}
                disabled={!selectedDepartment}
                className="w-full bg-transparent text-sm text-text-1 outline-none disabled:opacity-50"
              >
                <option value="">{t("noPosition")}</option>
                {selectedDepartment?.positions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </IconField>
          </Field>

          <Field label={t("manager")}>
            <IconField icon={IconUsersGroup}>
              <select
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                className="w-full bg-transparent text-sm text-text-1 outline-none"
              >
                <option value="">{t("noManager")}</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.email})
                  </option>
                ))}
              </select>
            </IconField>
          </Field>

          <Field label={t("kpiTemplate")}>
            <IconField icon={IconStack3}>
              <select
                value={kpiTemplateId}
                onChange={(e) => setKpiTemplateId(e.target.value)}
                className="w-full bg-transparent text-sm text-text-1 outline-none"
              >
                <option value="">{t("noKpiTemplate")}</option>
                {kpiTemplates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.annex_code}-{t("annex")}: {tpl.name}
                  </option>
                ))}
              </select>
            </IconField>
            {selectedTemplate && (
              <p className="mt-1 text-xs text-text-3">
                {selectedTemplate.academic_year} · {selectedTemplate.total_max_score} {t("maxScoreShort")}
              </p>
            )}
          </Field>

          <Field label={t("academicDegree")}>
            <IconField icon={IconCertificate}>
              <select
                value={academicDegree}
                onChange={(e) => setAcademicDegree(e.target.value as AcademicDegree)}
                className="w-full bg-transparent text-sm text-text-1 outline-none"
              >
                <option value="none">{t("academicDegreeValues.none")}</option>
                <option value="phd">{t("academicDegreeValues.phd")}</option>
                <option value="dsc">{t("academicDegreeValues.dsc")}</option>
                <option value="dotsent">{t("academicDegreeValues.dotsent")}</option>
                <option value="professor">{t("academicDegreeValues.professor")}</option>
              </select>
            </IconField>
          </Field>

          <div className="sm:col-span-2">
            <Field label={t("bonusFundOverride")}>
              <IconField icon={IconCoins}>
                <input
                  type="number"
                  min={0}
                  value={bonusFundOverride}
                  onChange={(e) => setBonusFundOverride(e.target.value)}
                  className="w-full bg-transparent text-sm text-text-1 outline-none"
                />
              </IconField>
            </Field>
          </div>
        </div>
      </FormSection>

      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-90 active:scale-[0.98] disabled:opacity-50"
        >
          {submitting ? t("saving") : t("save")}
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard/employees")}
          className="text-sm font-medium text-text-3 transition-colors hover:text-text-1"
        >
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-text-2">{label}</label>
      {children}
    </div>
  );
}
