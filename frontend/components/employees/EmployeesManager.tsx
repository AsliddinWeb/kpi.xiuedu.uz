"use client";

import {
  IconBan,
  IconBuilding,
  IconBuildingSkyscraper,
  IconCircleCheck,
  IconEye,
  IconFileSpreadsheet,
  IconFileText,
  IconFilterOff,
  IconPencil,
  IconPlus,
  IconSearch,
  IconUpload,
  IconUser,
  IconUserCheck,
  IconUserExclamation,
  IconUserOff,
  IconUsersGroup,
} from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import BreakdownDonutCard from "@/components/dashboard/BreakdownDonutCard";
import RankingBarChart from "@/components/dashboard/RankingBarChart";
import type { Department } from "@/lib/departments";
import type { Employee } from "@/lib/employees";
import type { KpiTemplate } from "@/lib/kpiTemplates";
import ActionMenu from "@/components/ui/ActionMenu";
import IconField from "@/components/ui/IconField";

type ImportRowResult = {
  row: number;
  email: string;
  status: "created" | "error";
  error?: string | null;
  temporary_password?: string | null;
};

type ImportSummary = {
  total: number;
  created: number;
  failed: number;
  results: ImportRowResult[];
};

const STATUS_TONE = {
  active: "bg-success-soft text-success",
  inactive: "bg-danger-soft text-danger",
  restricted: "bg-warning-soft text-warning",
};

// HEMIS auto-provisions new accounts with role="employee" and no department/
// position/kpi_template - an admin still has to walk through "Tashkilot va
// baholash" for each new arrival. Flag those so they don't get lost in a long
// list.
function needsSetup(emp: Employee): boolean {
  return (
    emp.auth_provider === "hemis" &&
    (emp.role === "employee" || emp.department_id == null || emp.position_id == null || emp.kpi_template_id == null)
  );
}

export default function EmployeesManager({
  initialEmployees,
  departments,
  kpiTemplates,
  viewerRole,
}: {
  initialEmployees: Employee[];
  departments: Department[];
  kpiTemplates: KpiTemplate[];
  viewerRole: string;
}) {
  const locale = useLocale();
  const t = useTranslations("employees");
  const roleT = useTranslations("roles");
  const canManage = viewerRole === "super_admin" || viewerRole === "admin";
  const [employees, setEmployees] = useState(initialEmployees);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [facultyFilter, setFacultyFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const faculties = useMemo(() => departments.filter((d) => d.department_type === "faculty"), [departments]);

  const facultyDepartmentIds = useMemo(() => {
    if (!facultyFilter) return null;
    const facultyId = Number(facultyFilter);
    const ids = new Set<number>([facultyId]);
    let added = true;
    while (added) {
      added = false;
      for (const d of departments) {
        if (d.parent_department_id != null && ids.has(d.parent_department_id) && !ids.has(d.id)) {
          ids.add(d.id);
          added = true;
        }
      }
    }
    return ids;
  }, [facultyFilter, departments]);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importing, setImporting] = useState(false);

  const stats = useMemo(
    () => ({
      total: employees.length,
      active: employees.filter((e) => e.is_active).length,
      restricted: employees.filter((e) => e.is_restricted).length,
      managers: employees.filter((e) => e.role === "manager").length,
      needsSetup: employees.filter(needsSetup).length,
    }),
    [employees],
  );

  const statusBreakdown = useMemo(
    () => ({
      active: employees.filter((e) => e.is_active && !e.is_restricted).length,
      restricted: employees.filter((e) => e.is_restricted).length,
      inactive: employees.filter((e) => !e.is_active).length,
    }),
    [employees],
  );

  const topDepartments = useMemo(() => {
    const counts = new Map<number, number>();
    for (const e of employees) {
      if (e.department_id == null) continue;
      counts.set(e.department_id, (counts.get(e.department_id) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([id, count]) => ({ name: departments.find((d) => d.id === id)?.name ?? "—", value: count, hasData: true }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [employees, departments]);

  const hasActiveFilters = !!(search || departmentFilter || facultyFilter || roleFilter || statusFilter);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      if (q && !e.full_name.toLowerCase().includes(q) && !e.email.toLowerCase().includes(q)) return false;
      if (departmentFilter && String(e.department_id ?? "") !== departmentFilter) return false;
      if (facultyDepartmentIds && (e.department_id == null || !facultyDepartmentIds.has(e.department_id)))
        return false;
      if (roleFilter && e.role !== roleFilter) return false;
      if (statusFilter === "active" && !e.is_active) return false;
      if (statusFilter === "inactive" && e.is_active) return false;
      if (statusFilter === "restricted" && !e.is_restricted) return false;
      if (statusFilter === "needs_setup" && !needsSetup(e)) return false;
      return true;
    });
  }, [employees, search, departmentFilter, facultyDepartmentIds, roleFilter, statusFilter]);

  function clearFilters() {
    setSearch("");
    setDepartmentFilter("");
    setFacultyFilter("");
    setRoleFilter("");
    setStatusFilter("");
  }

  async function refresh() {
    const res = await fetch("/api/v1/users", {
      headers: { "Accept-Language": locale },
      credentials: "include",
      cache: "no-store",
    });
    if (res.ok) setEmployees(await res.json());
  }

  async function toggleRestricted(emp: Employee) {
    setError(null);
    setBusyId(emp.id);
    try {
      const res = await fetch(`/api/v1/users/${emp.id}/restrict`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Accept-Language": locale },
        credentials: "include",
        body: JSON.stringify({ is_restricted: !emp.is_restricted }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.detail ?? t("genericError"));
        return;
      }
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(emp: Employee) {
    setError(null);
    setBusyId(emp.id);
    try {
      const url = emp.is_active ? `/api/v1/users/${emp.id}` : `/api/v1/users/${emp.id}/restore`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Accept-Language": locale },
        credentials: "include",
        body: emp.is_active ? JSON.stringify({ is_active: false }) : undefined,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.detail ?? t("genericError"));
        return;
      }
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function submitImport(file: File) {
    setError(null);
    setImporting(true);
    setImportSummary(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/v1/users/import", {
        method: "POST",
        headers: { "Accept-Language": locale },
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.detail ?? t("genericError"));
        return;
      }
      const summary: ImportSummary = await res.json();
      setImportSummary(summary);
      setImportFile(null);
      await refresh();
    } finally {
      setImporting(false);
    }
  }

  function handleImport(e: FormEvent) {
    e.preventDefault();
    if (importFile) void submitImport(importFile);
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-lg border border-danger-soft bg-danger-soft px-3 py-2.5 text-sm text-danger">{error}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatChip icon={IconUser} label={t("totalCount")} value={stats.total} tone="text-accent" />
        <StatChip icon={IconUserCheck} label={t("activeCount")} value={stats.active} tone="text-success" />
        <StatChip icon={IconBan} label={t("restrictedCount")} value={stats.restricted} tone="text-warning" />
        <StatChip icon={IconUsersGroup} label={t("managersCount")} value={stats.managers} tone="text-text-2" />
        {stats.needsSetup > 0 && (
          <button type="button" onClick={() => setStatusFilter("needs_setup")} className="text-left">
            <StatChip icon={IconUserExclamation} label={t("needsSetupCount")} value={stats.needsSetup} tone="text-danger" />
          </button>
        )}
      </div>

      {employees.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <BreakdownDonutCard
            title={t("statusBreakdown")}
            segments={[
              { label: t("active"), value: statusBreakdown.active, colorVar: "var(--success)" },
              { label: t("restricted"), value: statusBreakdown.restricted, colorVar: "var(--warning)" },
              { label: t("inactive"), value: statusBreakdown.inactive, colorVar: "var(--danger)" },
            ]}
          />
          <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
            <p className="mb-4 text-sm font-semibold text-text-1">{t("topDepartments")}</p>
            {topDepartments.length === 0 ? (
              <p className="text-sm text-text-3">{t("noDepartments")}</p>
            ) : (
              <RankingBarChart rows={topDepartments} max={Math.max(...topDepartments.map((d) => d.value), 1)} />
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {canManage && (
          <Link
            href="/dashboard/employees/new"
            className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-90 active:scale-[0.98]"
          >
            <IconPlus size={16} stroke={2.25} />
            {t("addEmployee")}
          </Link>
        )}

        <div className="group ml-auto flex min-w-[14rem] flex-1 items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2.5 transition-all focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft sm:max-w-xs">
          <IconSearch size={16} stroke={1.75} className="shrink-0 text-text-3 transition-colors group-focus-within:text-accent" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full bg-transparent text-sm text-text-1 outline-none placeholder:text-text-3"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {faculties.length > 0 && (
          <div className="w-44">
            <IconField icon={IconBuildingSkyscraper}>
              <select
                value={facultyFilter}
                onChange={(e) => setFacultyFilter(e.target.value)}
                className="w-full bg-transparent text-sm text-text-1 outline-none"
              >
                <option value="">{t("allFaculties")}</option>
                {faculties.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </IconField>
          </div>
        )}
        <div className="w-44">
          <IconField icon={IconBuilding}>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full bg-transparent text-sm text-text-1 outline-none"
            >
              <option value="">{t("allDepartments")}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </IconField>
        </div>
        <div className="w-40">
          <IconField icon={IconUsersGroup}>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full bg-transparent text-sm text-text-1 outline-none"
            >
              <option value="">{t("allRoles")}</option>
              <option value="employee">{roleT("employee")}</option>
              <option value="manager">{roleT("manager")}</option>
              <option value="admin">{roleT("admin")}</option>
              <option value="super_admin">{roleT("super_admin")}</option>
              <option value="rector">{roleT("rector")}</option>
              <option value="prorektor_birinchi">{roleT("prorektor_birinchi")}</option>
              <option value="prorektor_oquv">{roleT("prorektor_oquv")}</option>
              <option value="prorektor_xalqaro">{roleT("prorektor_xalqaro")}</option>
            </select>
          </IconField>
        </div>
        <div className="w-40">
          <IconField icon={IconUserCheck}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-transparent text-sm text-text-1 outline-none"
            >
              <option value="">{t("allStatuses")}</option>
              <option value="active">{t("active")}</option>
              <option value="inactive">{t("inactive")}</option>
              <option value="restricted">{t("restricted")}</option>
              <option value="needs_setup">{t("needsSetupFilter")}</option>
            </select>
          </IconField>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-sm font-medium text-text-3 transition-colors hover:text-text-1"
          >
            <IconFilterOff size={15} stroke={1.75} />
            {t("clearFilters")}
          </button>
        )}
      </div>

      {canManage && (
      <form
        onSubmit={handleImport}
        className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-surface p-4 shadow-soft"
      >
        <div className="min-w-[10rem] flex-1">
          <p className="text-sm font-semibold text-text-1">{t("excelImport")}</p>
          <p className="text-xs text-text-3">{t("excelColumns")}</p>
          <a
            href="/api/v1/users/import-template"
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-accent transition-opacity hover:opacity-75"
          >
            <IconFileSpreadsheet size={13} stroke={1.75} />
            {t("downloadTemplate")}
          </a>
        </div>
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) setImportFile(file);
          }}
          className="flex w-full max-w-xs cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-border bg-bg px-3.5 py-2.5 text-xs text-text-2 transition-colors hover:border-accent sm:w-auto"
        >
          <IconUpload size={16} stroke={1.5} className="shrink-0 text-text-3" />
          <span className="truncate">{importFile ? importFile.name : t("dropExcelHint")}</span>
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </label>
        <button
          type="submit"
          disabled={!importFile || importing}
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-90 active:scale-[0.98] disabled:opacity-50"
        >
          {importing ? t("importing") : t("import")}
        </button>
      </form>
      )}

      {importSummary && (
        <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
          <p className="mb-3 text-sm font-medium text-text-1">
            {t("importSummary", {
              created: importSummary.created,
              total: importSummary.total,
              failed: importSummary.failed,
            })}
          </p>
          <div className="max-h-64 overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-text-3">
                <tr>
                  <th className="py-1.5 pr-2 font-medium">{t("row")}</th>
                  <th className="py-1.5 pr-2 font-medium">Email</th>
                  <th className="py-1.5 pr-2 font-medium">{t("status")}</th>
                  <th className="py-1.5 font-medium">{t("detail")}</th>
                </tr>
              </thead>
              <tbody>
                {importSummary.results.map((r) => (
                  <tr key={r.row} className="border-t border-border">
                    <td className="py-1.5 pr-2 text-text-2">{r.row}</td>
                    <td className="py-1.5 pr-2 text-text-2">{r.email}</td>
                    <td className="py-1.5 pr-2">
                      <span
                        className={`flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          r.status === "created" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
                        }`}
                      >
                        {r.status === "created" ? <IconCircleCheck size={12} stroke={2} /> : <IconBan size={12} stroke={2} />}
                        {r.status === "created" ? t("created") : t("failed")}
                      </span>
                    </td>
                    <td className="py-1.5 text-text-2">
                      {r.status === "created" ? `${t("tempPassword")}: ${r.temporary_password}` : r.error}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-surface px-6 py-14 text-center">
          <IconFileText size={32} stroke={1.5} className="text-text-3" />
          <p className="text-sm font-semibold text-text-1">{employees.length === 0 ? t("emptyTitle") : t("noResults")}</p>
          {employees.length === 0 && <p className="max-w-xs text-xs text-text-3">{t("emptyHint")}</p>}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs text-text-3">
              <tr>
                <th className="px-4 py-3 font-medium">{t("fullName")}</th>
                <th className="px-4 py-3 font-medium">{t("role")}</th>
                <th className="px-4 py-3 font-medium">{t("departmentPosition")}</th>
                <th className="px-4 py-3 font-medium">{t("manager")}</th>
                <th className="px-4 py-3 font-medium">{t("kpiTemplate")}</th>
                <th className="px-4 py-3 font-medium">{t("status")}</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => {
                const template = kpiTemplates.find((tpl) => tpl.id === emp.kpi_template_id);
                const department = departments.find((d) => d.id === emp.department_id);
                const position = department?.positions.find((p) => p.id === emp.position_id);
                const flagged = needsSetup(emp);
                return (
                  <tr
                    key={emp.id}
                    className={`border-b border-border transition-colors last:border-0 ${
                      flagged ? "bg-danger-soft/40 hover:bg-danger-soft/60" : "hover:bg-surface-alt/50"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/employees/${emp.id}`} className="flex items-center gap-3 group/row">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-xs font-bold text-accent">
                          {emp.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-text-1 group-hover/row:text-accent">
                            <span className="truncate">{emp.full_name}</span>
                            {flagged ? (
                              <span
                                title={t("needsSetupHint")}
                                className="flex shrink-0 items-center gap-0.5 rounded-full bg-danger px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-white"
                              >
                                <IconUserExclamation size={10} stroke={2.25} />
                                {t("needsSetupBadge")}
                              </span>
                            ) : (
                              emp.auth_provider === "hemis" && (
                                <span
                                  title={t("hemisLinked")}
                                  className="shrink-0 rounded-full bg-accent-soft px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-accent"
                                >
                                  HEMIS
                                </span>
                              )
                            )}
                          </p>
                          <p className="truncate text-xs text-text-3">{emp.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text-2">
                      <span className="rounded-full bg-surface-alt px-2.5 py-1 text-xs font-medium text-text-2">
                        {roleT(emp.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-2">
                      {department ? (
                        <div>
                          <p className="text-sm text-text-1">{department.name}</p>
                          {position && <p className="text-xs text-text-3">{position.title}</p>}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-2">
                      {employees.find((m) => m.id === emp.manager_id)?.full_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-text-2">
                      {template ? (
                        <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
                          {template.annex_code}-{t("annex")}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            emp.is_active ? STATUS_TONE.active : STATUS_TONE.inactive
                          }`}
                        >
                          {emp.is_active ? <IconUserCheck size={12} stroke={2} /> : <IconUserOff size={12} stroke={2} />}
                          {emp.is_active ? t("active") : t("inactive")}
                        </span>
                        {emp.is_restricted && (
                          <span className={`flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_TONE.restricted}`}>
                            <IconBan size={12} stroke={2} />
                            {t("restricted")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ActionMenu
                        label={t("actions")}
                        items={[
                          { label: t("view"), icon: IconEye, href: `/dashboard/employees/${emp.id}` },
                          ...(canManage
                            ? [
                                { label: t("edit"), icon: IconPencil, href: `/dashboard/employees/${emp.id}/edit` },
                                {
                                  label: emp.is_restricted ? t("unrestrict") : t("restrict"),
                                  icon: IconBan,
                                  tone: emp.is_restricted ? ("default" as const) : ("danger" as const),
                                  disabled: busyId === emp.id,
                                  onClick: () => toggleRestricted(emp),
                                },
                                {
                                  label: emp.is_active ? t("deactivate") : t("restoreEmployee"),
                                  icon: emp.is_active ? IconUserOff : IconUserCheck,
                                  tone: emp.is_active ? ("danger" as const) : ("default" as const),
                                  disabled: busyId === emp.id,
                                  onClick: () => toggleActive(emp),
                                },
                              ]
                            : []),
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatChip({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof IconUsersGroup;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-current/10 ${tone}`}>
        <Icon size={18} stroke={1.75} />
      </div>
      <div>
        <p className="text-lg font-bold leading-none text-text-1 tabular-nums">{value}</p>
        <p className="text-xs text-text-3">{label}</p>
      </div>
    </div>
  );
}
