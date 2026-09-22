import {
  IconBan,
  IconBellRinging,
  IconChevronLeft,
  IconChevronRight,
  IconCircleCheck,
  IconFileSpreadsheet,
  IconFilterOff,
  IconFlag3,
  IconFlagOff,
  IconGauge,
  IconHistory,
  IconLock,
  IconLockOpen,
  IconLogin,
  IconPencil,
  IconPlus,
  IconReportAnalytics,
  IconReportMoney,
  IconRobot,
  IconRotate,
  IconSend,
  IconShieldCheck,
  IconShieldX,
  IconThumbUp,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuditLog } from "@/lib/audit";
import { getMe } from "@/lib/auth";
import { getEmployees } from "@/lib/employees";

const PAGE_SIZE = 20;

const ACTION_META: Record<string, { icon: typeof IconPlus; tone: string }> = {
  login: { icon: IconLogin, tone: "bg-accent-soft text-accent" },
  create: { icon: IconPlus, tone: "bg-success-soft text-success" },
  update: { icon: IconPencil, tone: "bg-accent-soft text-accent" },
  delete: { icon: IconTrash, tone: "bg-danger-soft text-danger" },
  approve: { icon: IconCircleCheck, tone: "bg-success-soft text-success" },
  submit: { icon: IconSend, tone: "bg-accent-soft text-accent" },
  approve_bonus: { icon: IconReportMoney, tone: "bg-success-soft text-success" },
  create_export: { icon: IconFileSpreadsheet, tone: "bg-accent-soft text-accent" },
  complete_setup: { icon: IconCircleCheck, tone: "bg-success-soft text-success" },
  score: { icon: IconGauge, tone: "bg-accent-soft text-accent" },
  reject: { icon: IconX, tone: "bg-danger-soft text-danger" },
  resolve: { icon: IconCircleCheck, tone: "bg-success-soft text-success" },
  restore: { icon: IconRotate, tone: "bg-accent-soft text-accent" },
  restrict: { icon: IconLock, tone: "bg-danger-soft text-danger" },
  unrestrict: { icon: IconLockOpen, tone: "bg-success-soft text-success" },
  revoke: { icon: IconBan, tone: "bg-danger-soft text-danger" },
  endorse: { icon: IconThumbUp, tone: "bg-accent-soft text-accent" },
  head_approve: { icon: IconShieldCheck, tone: "bg-success-soft text-success" },
  head_reject: { icon: IconShieldX, tone: "bg-danger-soft text-danger" },
  declare: { icon: IconFlag3, tone: "bg-warning-soft text-warning" },
  acknowledge: { icon: IconBellRinging, tone: "bg-accent-soft text-accent" },
  generate: { icon: IconReportAnalytics, tone: "bg-accent-soft text-accent" },
  close: { icon: IconFlagOff, tone: "bg-surface-alt text-text-2" },
};

const ACTION_OPTIONS = Object.keys(ACTION_META);
const ENTITY_OPTIONS = [
  "user",
  "department",
  "position",
  "kpi_template",
  "ariza",
  "kpi_result",
  "category_reviewer",
  "category_head_approver",
  "indicator_rank_override",
  "category_rank_override",
  "correction_plan",
  "force_majeure",
  "incentive",
  "work_plan",
  "summary",
  "bonus_approval",
  "payroll_export",
  "company_settings",
];

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31536000],
  ["month", 2592000],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

function timeAgo(iso: string, locale: string): string {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [unit, secondsInUnit] of UNITS) {
    const value = Math.floor(seconds / secondsInUnit);
    if (Math.abs(value) >= 1) return rtf.format(-value, unit);
  }
  return rtf.format(0, "second");
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: { page?: string; action?: string; entity?: string; user?: string };
}) {
  const locale = await getLocale();
  const user = await getMe(locale);
  if (!user) redirect("/login");
  if (user.role !== "super_admin" && user.role !== "admin") redirect("/dashboard");

  const page = Math.max(1, Number(searchParams.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const actionFilter = searchParams.action ?? "";
  const entityFilter = searchParams.entity ?? "";
  const userFilter = searchParams.user ?? "";

  const [{ total, items }, employees] = await Promise.all([
    getAuditLog(locale, PAGE_SIZE, offset, { action: actionFilter, entity: entityFilter, userId: userFilter }),
    getEmployees(locale),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const t = await getTranslations("auditLog");

  const pageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (actionFilter) params.set("action", actionFilter);
    if (entityFilter) params.set("entity", entityFilter);
    if (userFilter) params.set("user", userFilter);
    params.set("page", String(targetPage));
    return `/dashboard/audit-log?${params.toString()}`;
  };

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-text-1">{t("heading")}</h1>

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-2">{t("columnUserFilter")}</label>
          <select
            name="user"
            defaultValue={userFilter}
            className="rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-text-1 outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent-soft"
          >
            <option value="">{t("allUsers")}</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.full_name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-2">{t("columnAction")}</label>
          <select
            name="action"
            defaultValue={actionFilter}
            className="rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-text-1 outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent-soft"
          >
            <option value="">{t("allActions")}</option>
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {t(`actions.${a}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-2">{t("columnEntity")}</label>
          <select
            name="entity"
            defaultValue={entityFilter}
            className="rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-text-1 outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent-soft"
          >
            <option value="">{t("allEntities")}</option>
            {ENTITY_OPTIONS.map((e) => (
              <option key={e} value={e}>
                {t(`entities.${e}`)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-90 active:scale-[0.98]"
        >
          {t("applyFilters")}
        </button>
        {(actionFilter || entityFilter || userFilter) && (
          <Link
            href="/dashboard/audit-log"
            className="flex items-center gap-1.5 text-sm font-medium text-text-3 transition-colors hover:text-text-1"
          >
            <IconFilterOff size={15} stroke={1.75} />
            {t("clearFilters")}
          </Link>
        )}
      </form>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-surface px-6 py-14 text-center">
          <IconHistory size={32} stroke={1.5} className="text-text-3" />
          <p className="text-sm font-semibold text-text-1">
            {actionFilter || entityFilter || userFilter ? t("noFilterResults") : t("noEntries")}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs text-text-3">
              <tr>
                <th className="px-4 py-3 font-medium">{t("columnDate")}</th>
                <th className="px-4 py-3 font-medium">{t("columnUser")}</th>
                <th className="px-4 py-3 font-medium">{t("columnAction")}</th>
                <th className="px-4 py-3 font-medium">{t("columnEntity")}</th>
                <th className="px-4 py-3 font-medium">{t("columnEntityId")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((entry) => {
                const meta = ACTION_META[entry.action] ?? { icon: IconHistory, tone: "bg-surface-alt text-text-2" };
                const ActionIcon = meta.icon;
                return (
                  <tr key={entry.id} className="border-b border-border transition-colors last:border-0 hover:bg-surface-alt/50">
                    <td className="whitespace-nowrap px-4 py-3 text-text-2" title={new Date(entry.created_at).toLocaleString(locale)}>
                      {timeAgo(entry.created_at, locale)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                            entry.user_full_name ? "bg-accent-soft text-accent" : "bg-surface-alt text-text-3"
                          }`}
                        >
                          {entry.user_full_name ? entry.user_full_name.charAt(0).toUpperCase() : <IconRobot size={14} stroke={1.75} />}
                        </div>
                        <span className="text-text-1">{entry.user_full_name ?? t("systemUser")}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.tone}`}>
                        <ActionIcon size={12} stroke={2} />
                        {t(`actions.${entry.action}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-surface-alt px-2.5 py-1 text-xs font-medium text-text-2">
                        {t(`entities.${entry.entity}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-3 tabular-nums">{entry.entity_id ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-text-2">
          <Link
            href={pageHref(page - 1)}
            aria-disabled={page <= 1}
            className={`flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 transition-colors ${
              page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-surface-alt"
            }`}
          >
            <IconChevronLeft size={14} stroke={2} />
            {t("prev")}
          </Link>
          <span className="text-xs text-text-3">{t("pageOf", { current: page, total: totalPages })}</span>
          <Link
            href={pageHref(page + 1)}
            aria-disabled={page >= totalPages}
            className={`flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 transition-colors ${
              page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-surface-alt"
            }`}
          >
            {t("next")}
            <IconChevronRight size={14} stroke={2} />
          </Link>
        </div>
      )}
    </div>
  );
}
