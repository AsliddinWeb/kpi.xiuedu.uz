"use client";

import {
  IconBriefcase,
  IconBuilding,
  IconCalendar,
  IconCertificate,
  IconCircleCheck,
  IconCircleX,
  IconClock,
  IconClockHour4,
  IconFolderOpen,
  IconGauge,
  IconId,
  IconLogin2,
  IconMail,
  IconPencil,
  IconPhone,
  IconSchool,
  IconShieldCheck,
  IconStack3,
  IconUserCheck,
  IconUsersGroup,
} from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import type { Department, Position } from "@/lib/departments";
import type { MyKpiIndicatorRow } from "@/lib/dashboard";
import type { Employee } from "@/lib/employees";
import type { KpiResult } from "@/lib/kpiResults";
import type { KpiTemplate } from "@/lib/kpiTemplates";
import TimeAgo from "@/components/ui/TimeAgo";

const STATUS_META: Record<string, { icon: typeof IconClock; tone: string }> = {
  submitted: { icon: IconClock, tone: "bg-warning-soft text-warning" },
  kafedra_endorsed: { icon: IconShieldCheck, tone: "bg-accent-soft text-accent" },
  scored: { icon: IconCircleCheck, tone: "bg-success-soft text-success" },
  pending_head_approval: { icon: IconUserCheck, tone: "bg-warning-soft text-warning" },
  approved: { icon: IconCircleCheck, tone: "bg-success-soft text-success" },
  rejected: { icon: IconCircleX, tone: "bg-danger-soft text-danger" },
};

export default function EmployeeDetailView({
  employee,
  department,
  position,
  managerName,
  template,
  defaultPeriod,
  initialKpiResults,
  initialRows,
  viewerRole,
}: {
  employee: Employee;
  department: Department | null;
  position: Position | null;
  managerName: string | null;
  template: KpiTemplate | null;
  defaultPeriod: string | null;
  initialKpiResults: KpiResult[];
  initialRows: MyKpiIndicatorRow[];
  viewerRole: string;
}) {
  const locale = useLocale();
  const t = useTranslations("employeeDetail");
  const roleT = useTranslations("roles");
  const degreeT = useTranslations("profile.academicDegreeValues");

  const [period, setPeriod] = useState(defaultPeriod ?? "");
  const [rows, setRows] = useState(initialRows);
  const [loading, setLoading] = useState(false);

  const hemis = employee;

  const canEdit = viewerRole === "super_admin" || viewerRole === "admin";
  const photoUrl = hemis.hemis_image_url || hemis.hemis_picture_url;
  const hasHemisLink = hemis.auth_provider === "hemis" || Boolean(hemis.hemis_employee_id_number);

  const currentResult = initialKpiResults.find((r) => r.period === period) ?? null;

  const groups = (() => {
    const map = new Map<number, { id: number; name: string; maxScore: number; rows: MyKpiIndicatorRow[] }>();
    for (const row of rows) {
      if (!map.has(row.category_id)) {
        map.set(row.category_id, { id: row.category_id, name: row.category_name, maxScore: row.category_max_score, rows: [] });
      }
      map.get(row.category_id)!.rows.push(row);
    }
    return Array.from(map.values());
  })();

  async function loadPeriod(nextPeriod: string) {
    if (!nextPeriod) return;
    setPeriod(nextPeriod);
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/dashboard/my-kpi?period=${nextPeriod}&user_id=${employee.id}`, {
        headers: { "Accept-Language": locale },
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) setRows(await res.json());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
        <div className="flex flex-wrap items-start gap-4">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-accent-soft">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt={employee.full_name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl font-bold text-accent">
                {employee.full_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-text-1">{employee.full_name}</p>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-surface-alt px-2.5 py-1 text-xs font-medium text-text-2">
              {roleT(employee.role)}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                employee.is_active ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
              }`}
            >
              {employee.is_active ? t("active") : t("inactive")}
            </div>
            {canEdit && (
              <Link
                href={`/dashboard/employees/${employee.id}/edit`}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-90"
              >
                <IconPencil size={13} stroke={2} />
                {t("edit")}
              </Link>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem icon={IconMail} label={t("email")} value={employee.email} />
          <InfoItem icon={IconCertificate} label={t("academicDegree")} value={degreeT(employee.academic_degree)} />
          <InfoItem icon={IconBuilding} label={t("department")} value={department?.name ?? "-"} />
          <InfoItem icon={IconBriefcase} label={t("position")} value={position?.title ?? "-"} />
          <InfoItem icon={IconUsersGroup} label={t("manager")} value={managerName ?? "-"} />
          <InfoItem
            icon={IconStack3}
            label={t("kpiTemplate")}
            value={template ? `${template.annex_code}-${t("annex")}: ${template.name}` : "-"}
          />
          <InfoItem
            icon={IconLogin2}
            label={t("lastLogin")}
            value={employee.last_login_at ? <TimeAgo iso={employee.last_login_at} locale={locale} /> : t("never")}
          />
        </div>
      </div>

      {hasHemisLink && (
        <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
          <div className="flex items-center gap-2">
            <IconSchool size={16} stroke={1.75} className="text-text-3" />
            <p className="text-sm font-semibold text-text-1">{t("hemisInfo")}</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {hemis.hemis_login && <InfoItem icon={IconId} label={t("hemisLogin")} value={hemis.hemis_login} />}
            {hemis.hemis_phone && <InfoItem icon={IconPhone} label={t("hemisPhone")} value={hemis.hemis_phone} />}
            {hemis.hemis_type && <InfoItem icon={IconId} label={t("hemisType")} value={hemis.hemis_type} />}
            {hemis.hemis_birth_date && (
              <InfoItem icon={IconCalendar} label={t("hemisBirthDate")} value={hemis.hemis_birth_date} />
            )}
            {hemis.hemis_academic_rank_name && (
              <InfoItem icon={IconCertificate} label={t("hemisAcademicRank")} value={hemis.hemis_academic_rank_name} />
            )}
            {hemis.hemis_staff_position_name && (
              <InfoItem icon={IconBriefcase} label={t("hemisStaffPosition")} value={hemis.hemis_staff_position_name} />
            )}
            {hemis.hemis_employment_status_name && (
              <InfoItem icon={IconShieldCheck} label={t("hemisEmploymentStatus")} value={hemis.hemis_employment_status_name} />
            )}
            {hemis.hemis_department_name && (
              <InfoItem icon={IconBuilding} label={t("hemisDepartment")} value={hemis.hemis_department_name} />
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-border pt-3 text-xs text-text-3">
            <span className="flex items-center gap-1.5">
              <IconClockHour4 size={12} stroke={1.75} />
              {t("hemisOAuthSynced")}:{" "}
              {hemis.hemis_last_synced_at ? <TimeAgo iso={hemis.hemis_last_synced_at} locale={locale} /> : t("never")}
            </span>
          </div>
        </div>
      )}

      {template ? (
        <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <IconGauge size={16} stroke={1.75} className="text-text-3" />
              <p className="text-sm font-semibold text-text-1">{t("kpiSummary")}</p>
            </div>
            <div className="flex items-center gap-2">
              <IconCalendar size={14} stroke={1.75} className="text-text-3" />
              <input
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                onBlur={(e) => loadPeriod(e.target.value)}
                className="w-28 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-xs text-text-1 outline-none focus:border-accent"
              />
            </div>
          </div>

          {currentResult && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-2xl font-bold tabular-nums text-text-1">{currentResult.total_score}</span>
              <span className="text-sm text-text-3">/ {template.total_max_score}</span>
              <span
                className={`ml-auto rounded-full px-2.5 py-1 text-xs font-semibold ${
                  currentResult.status === "approved" ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
                }`}
              >
                {t(`resultStatus.${currentResult.status}`)}
              </span>
            </div>
          )}

          <div className="mt-4 space-y-4">
            {loading ? (
              <p className="py-6 text-center text-xs text-text-3">{t("loading")}</p>
            ) : groups.length === 0 ? (
              <p className="py-6 text-center text-xs text-text-3">{t("noIndicators")}</p>
            ) : (
              groups.map((group) => {
                const groupAwarded = group.rows.reduce((sum, r) => sum + r.awarded_total, 0);
                return (
                  <div key={group.id} className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <IconFolderOpen size={14} stroke={1.75} className="text-text-3" />
                      <h3 className="text-xs font-semibold text-text-1">{group.name}</h3>
                      <span className="ml-auto text-xs font-semibold text-text-3 tabular-nums">
                        {Math.round(groupAwarded * 10) / 10} / {group.maxScore}
                      </span>
                    </div>
                    {group.rows.map((row) => {
                      const percent = row.max_score > 0 ? (row.awarded_total / row.max_score) * 100 : 0;
                      return (
                        <div key={row.kpi_indicator_id} className="rounded-lg border border-border bg-bg p-3">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-text-2">{row.indicator_name}</span>
                            <span className="shrink-0 font-semibold text-text-1 tabular-nums">
                              {row.awarded_total} / {row.max_score}
                            </span>
                          </div>
                          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-alt">
                            <div
                              className="h-full rounded-full bg-accent transition-[width] duration-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          {row.submissions.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {row.submissions.map((sub) => {
                                const meta = STATUS_META[sub.status];
                                return (
                                  <span
                                    key={sub.ariza_id}
                                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${
                                      meta ? meta.tone : "bg-surface-alt text-text-3"
                                    }`}
                                  >
                                    {meta && <meta.icon size={11} stroke={2} />}
                                    {sub.awarded_score ?? "-"}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-14 text-center">
          <p className="text-sm font-medium text-text-1">{t("noTemplateAssigned")}</p>
        </div>
      )}
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof IconMail;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-bg px-3 py-2">
      <Icon size={15} stroke={1.75} className="shrink-0 text-text-3" />
      <div className="min-w-0">
        <p className="truncate text-sm text-text-1">{value}</p>
        <p className="text-[0.65rem] text-text-3">{label}</p>
      </div>
    </div>
  );
}
