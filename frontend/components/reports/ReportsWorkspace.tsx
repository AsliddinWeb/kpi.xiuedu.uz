"use client";

import {
  IconBuildingSkyscraper,
  IconCalendar,
  IconChartBar,
  IconCircleCheck,
  IconCoins,
  IconDownload,
  IconFileSpreadsheet,
  IconFileTypePdf,
  IconGauge,
  IconLoader2,
  IconReportMoney,
  IconTrophy,
  IconX,
} from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import BreakdownDonutCard from "@/components/dashboard/BreakdownDonutCard";
import StatCard from "@/components/dashboard/StatCard";
import type { DepartmentComparisonRow } from "@/lib/dashboard";
import type { PayrollExport } from "@/lib/exports";
import FormSection from "@/components/ui/FormSection";
import IconField from "@/components/ui/IconField";
import DepartmentBarChart from "./DepartmentBarChart";

type BonusRow = {
  user_id: number;
  full_name: string;
  email: string;
  bonus_fund: number | null;
  final_kpi_percent: number;
  bonus_amount: number | null;
};

type BonusApprovalStatus = {
  period: string;
  approved: boolean;
  approved_at: string | null;
};

const EXPORT_STATUS_META = {
  pending: { icon: IconLoader2, tone: "bg-warning-soft text-warning", spin: true },
  completed: { icon: IconCircleCheck, tone: "bg-success-soft text-success", spin: false },
  failed: { icon: IconX, tone: "bg-danger-soft text-danger", spin: false },
};

export default function ReportsWorkspace({
  departments,
  initialExports,
  viewerRole,
  academicYears,
}: {
  departments: DepartmentComparisonRow[];
  initialExports: PayrollExport[];
  viewerRole: string;
  academicYears: string[];
}) {
  const locale = useLocale();
  const t = useTranslations("reports");
  const dashT = useTranslations("dashboard");
  const canManage = viewerRole === "super_admin" || viewerRole === "admin";

  const [period, setPeriod] = useState(academicYears[0] ?? "");
  const [format, setFormat] = useState<"xlsx" | "pdf">("xlsx");
  const [exportsList, setExportsList] = useState(initialExports);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [bonusRows, setBonusRows] = useState<BonusRow[] | null>(null);
  const [bonusStatus, setBonusStatus] = useState<BonusApprovalStatus | null>(null);
  const [loadingBonus, setLoadingBonus] = useState(false);
  const [approvingBonus, setApprovingBonus] = useState(false);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function refreshExports() {
    const res = await fetch("/api/v1/exports", {
      headers: { "Accept-Language": locale },
      credentials: "include",
      cache: "no-store",
    });
    if (res.ok) setExportsList(await res.json());
  }

  async function loadBonuses(e: FormEvent) {
    e.preventDefault();
    if (!period) return;
    setError(null);
    setLoadingBonus(true);
    try {
      const [rowsRes, statusRes] = await Promise.all([
        fetch(`/api/v1/bonuses?period=${period}`, {
          headers: { "Accept-Language": locale },
          credentials: "include",
          cache: "no-store",
        }),
        fetch(`/api/v1/bonuses/status?period=${period}`, {
          headers: { "Accept-Language": locale },
          credentials: "include",
          cache: "no-store",
        }),
      ]);
      if (rowsRes.ok) setBonusRows(await rowsRes.json());
      if (statusRes.ok) setBonusStatus(await statusRes.json());
    } finally {
      setLoadingBonus(false);
    }
  }

  async function approveBonuses() {
    if (!period) return;
    setError(null);
    setApprovingBonus(true);
    try {
      const res = await fetch("/api/v1/bonuses/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept-Language": locale },
        credentials: "include",
        body: JSON.stringify({ period }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.detail ?? t("genericError"));
        return;
      }
      setBonusStatus(await res.json());
    } finally {
      setApprovingBonus(false);
    }
  }

  async function createExport(e: FormEvent) {
    e.preventDefault();
    if (!period) return;
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/v1/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept-Language": locale },
        credentials: "include",
        body: JSON.stringify({ period, format }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.detail ?? t("genericError"));
        return;
      }
      await refreshExports();

      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts += 1;
        await refreshExports();
        if (attempts >= 10 && pollRef.current) {
          clearInterval(pollRef.current);
        }
      }, 1500);
    } finally {
      setCreating(false);
    }
  }

  const maxFinalKpi = bonusRows ? Math.max(...bonusRows.map((r) => r.final_kpi_percent), 1) : 1;

  const scoredDepartments = useMemo(() => departments.filter((d) => d.average_score != null), [departments]);
  const topDepartment = useMemo(
    () =>
      scoredDepartments.length
        ? scoredDepartments.reduce((best, d) => ((d.average_score ?? 0) > (best.average_score ?? 0) ? d : best))
        : null,
    [scoredDepartments],
  );
  const orgAverage = scoredDepartments.length
    ? Math.round(
        (scoredDepartments.reduce((sum, d) => sum + (d.average_score ?? 0), 0) / scoredDepartments.length) * 10,
      ) / 10
    : null;
  const totalEmployees = useMemo(() => departments.reduce((sum, d) => sum + d.employee_count, 0), [departments]);

  const exportStatusBreakdown = useMemo(
    () => ({
      pending: exportsList.filter((e) => e.status === "pending").length,
      completed: exportsList.filter((e) => e.status === "completed").length,
      failed: exportsList.filter((e) => e.status === "failed").length,
    }),
    [exportsList],
  );

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-lg border border-danger-soft bg-danger-soft px-3 py-2.5 text-sm text-danger">{error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title={dashT("totalDepartments")} value={String(departments.length)} icon={IconBuildingSkyscraper} />
        <StatCard title={dashT("totalEmployees")} value={String(totalEmployees)} icon={IconGauge} tone="success" />
        <StatCard
          title={t("topDepartment")}
          value={topDepartment ? topDepartment.department_name : "—"}
          hint={topDepartment ? `${topDepartment.average_score}%` : undefined}
          icon={IconTrophy}
          tone="warning"
        />
        <StatCard
          title={dashT("orgAverageScore")}
          value={orgAverage != null ? `${orgAverage}%` : "—"}
          icon={IconChartBar}
          tone="danger"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FormSection icon={IconChartBar} title={t("departmentComparison")}>
          {departments.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <IconBuildingSkyscraper size={28} stroke={1.5} className="text-text-3" />
              <p className="text-sm text-text-3">{t("noDepartments")}</p>
            </div>
          ) : (
            <>
              <DepartmentBarChart departments={departments} />
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-3 text-xs text-text-3">
                {departments.map((d) => (
                  <span key={d.department_id}>
                    {d.department_name}: <span className="font-semibold text-text-2">{d.employee_count}</span> {t("employeeCount").toLowerCase()}
                  </span>
                ))}
              </div>
            </>
          )}
        </FormSection>

        <BreakdownDonutCard
          title={t("exportsBreakdown")}
          segments={[
            { label: t("exportStatus.completed"), value: exportStatusBreakdown.completed, colorVar: "var(--success)" },
            { label: t("exportStatus.pending"), value: exportStatusBreakdown.pending, colorVar: "var(--warning)" },
            { label: t("exportStatus.failed"), value: exportStatusBreakdown.failed, colorVar: "var(--danger)" },
          ]}
        />
      </div>

      <FormSection icon={IconReportMoney} title={t("loadBonuses")}>
        <form onSubmit={loadBonuses} className="flex flex-wrap items-end gap-3">
          <IconField icon={IconCalendar}>
            <select
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value);
                setBonusRows(null);
                setBonusStatus(null);
              }}
              className="w-36 bg-transparent text-sm text-text-1 outline-none"
            >
              {academicYears.length === 0 && <option value="">—</option>}
              {academicYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </IconField>
          <button
            type="submit"
            disabled={!period || loadingBonus}
            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-90 active:scale-[0.98] disabled:opacity-50"
          >
            {loadingBonus ? t("loading") : t("loadBonuses")}
          </button>
          {bonusRows && (
            <span
              className={`ml-auto flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                bonusStatus?.approved ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
              }`}
            >
              {bonusStatus?.approved ? <IconCircleCheck size={13} stroke={2} /> : null}
              {bonusStatus?.approved ? t("bonusApproved") : t("bonusNotApproved")}
            </span>
          )}
          {canManage && bonusRows && !bonusStatus?.approved && (
            <button
              type="button"
              onClick={approveBonuses}
              disabled={approvingBonus || bonusRows.length === 0}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-90 active:scale-[0.98] disabled:opacity-50"
            >
              {approvingBonus ? t("approving") : t("approveBonus")}
            </button>
          )}
        </form>

        {bonusRows && (
          <div className="mt-4">
            {bonusRows.length === 0 ? (
              <p className="rounded-lg bg-bg px-3 py-4 text-center text-sm text-text-3">{t("noBonusRows")}</p>
            ) : (
              <>
                <div className="mb-4 grid gap-3 sm:grid-cols-3">
                  <div className="flex items-center gap-2.5 rounded-lg bg-bg px-3.5 py-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-current/10 text-accent">
                      <IconCoins size={15} stroke={1.75} />
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-none text-text-1 tabular-nums">
                        {bonusRows.reduce((sum, r) => sum + (r.bonus_amount ?? 0), 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-text-3">{t("totalBonusDistributed")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 rounded-lg bg-bg px-3.5 py-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-current/10 text-success">
                      <IconGauge size={15} stroke={1.75} />
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-none text-text-1 tabular-nums">
                        {Math.round((bonusRows.reduce((sum, r) => sum + r.final_kpi_percent, 0) / bonusRows.length) * 10) / 10}%
                      </p>
                      <p className="text-xs text-text-3">{t("averageKpiPercent")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 rounded-lg bg-bg px-3.5 py-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-current/10 text-text-2">
                      <IconGauge size={15} stroke={1.75} />
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-none text-text-1 tabular-nums">{bonusRows.length}</p>
                      <p className="text-xs text-text-3">{t("employeeCount")}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
            {bonusRows.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-bg text-xs text-text-3">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">{t("employee")}</th>
                      <th className="px-4 py-2.5 font-medium">{t("finalKpiPercent")}</th>
                      <th className="px-4 py-2.5 font-medium text-right">{t("bonusAmount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bonusRows.map((row) => (
                      <tr key={row.user_id} className="border-b border-border transition-colors last:border-0 hover:bg-surface-alt/50">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-xs font-bold text-accent">
                              {row.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-text-1">{row.full_name}</p>
                              <p className="truncate text-xs text-text-3">{row.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-alt">
                              <div
                                className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out"
                                style={{ width: `${Math.min((row.final_kpi_percent / maxFinalKpi) * 100, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-text-1 tabular-nums">{row.final_kpi_percent}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right text-sm font-bold text-text-1 tabular-nums">
                          {row.bonus_amount?.toLocaleString() ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </FormSection>

      <FormSection icon={IconFileSpreadsheet} title={t("excelExport")}>
        {canManage && (
        <form onSubmit={createExport} className="flex flex-wrap items-end gap-3">
          <IconField icon={IconCalendar}>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-36 bg-transparent text-sm text-text-1 outline-none"
            >
              {academicYears.length === 0 && <option value="">—</option>}
              {academicYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </IconField>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFormat("xlsx")}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                format === "xlsx" ? "bg-accent-soft text-accent" : "bg-surface-alt text-text-3 hover:text-text-1"
              }`}
            >
              <IconFileSpreadsheet size={16} stroke={1.75} />
              {t("formatXlsx")}
            </button>
            <button
              type="button"
              onClick={() => setFormat("pdf")}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                format === "pdf" ? "bg-accent-soft text-accent" : "bg-surface-alt text-text-3 hover:text-text-1"
              }`}
            >
              <IconFileTypePdf size={16} stroke={1.75} />
              {t("formatPdf")}
            </button>
          </div>
          <button
            type="submit"
            disabled={!period || creating}
            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-90 active:scale-[0.98] disabled:opacity-50"
          >
            {creating ? t("generating") : t("generate")}
          </button>
        </form>
        )}

        {exportsList.length === 0 ? (
          <p className="mt-4 rounded-lg bg-bg px-3 py-4 text-center text-sm text-text-3">{t("noExports")}</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-bg text-xs text-text-3">
                <tr>
                  <th className="px-4 py-2.5 font-medium">{t("period")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("format")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("status")}</th>
                  <th className="px-4 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody>
                {exportsList.map((exp) => {
                  const meta = EXPORT_STATUS_META[exp.status];
                  const StatusIcon = meta.icon;
                  const FormatIcon = exp.format === "xlsx" ? IconFileSpreadsheet : IconFileTypePdf;
                  return (
                    <tr key={exp.id} className="border-b border-border transition-colors last:border-0 hover:bg-surface-alt/50">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-text-2">
                            <FormatIcon size={15} stroke={1.75} />
                          </div>
                          <span className="font-medium text-text-1">{exp.period}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 uppercase text-text-2">{exp.format}</td>
                      <td className="px-4 py-2.5">
                        <span className={`flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.tone}`}>
                          <StatusIcon size={12} stroke={2} className={meta.spin ? "animate-spin" : ""} />
                          {t(`exportStatus.${exp.status}`)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {exp.status === "completed" && (
                          <a
                            href={`/api/v1/exports/${exp.id}/download`}
                            aria-label={t("download")}
                            className="inline-flex items-center gap-1 rounded-lg bg-accent-soft px-2.5 py-1.5 text-xs font-semibold text-accent transition-opacity hover:opacity-80"
                          >
                            <IconDownload size={13} stroke={1.75} />
                            {t("download")}
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </FormSection>
    </div>
  );
}
