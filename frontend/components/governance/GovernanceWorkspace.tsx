"use client";

import {
  IconBan,
  IconCertificate,
  IconCircleCheck,
  IconClipboardOff,
  IconClipboardText,
  IconClock,
  IconCloudOff,
  IconCloudStorm,
  IconCoin,
  IconFilterOff,
  IconGift,
  IconGiftOff,
  IconMessage2,
  IconPlane,
  IconPlus,
  IconTag,
  IconTrendingDown,
  IconAlertTriangle,
  IconUser,
  IconUserX,
  IconX,
} from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo, useState } from "react";
import BreakdownDonutCard from "@/components/dashboard/BreakdownDonutCard";
import type { Employee } from "@/lib/employees";
import type { CorrectionPlan, ForceMajeureDeclaration, Incentive } from "@/lib/governance";
import StatChip from "@/components/ui/StatChip";
import IconField from "@/components/ui/IconField";
import TimeAgo from "@/components/ui/TimeAgo";

const STAGES = ["load_reduction", "warning", "termination"] as const;
const INCENTIVE_TYPES = ["monetary", "title", "certificate", "training_trip", "other"] as const;

const STAGE_META: Record<(typeof STAGES)[number], { icon: typeof IconTrendingDown; tone: string; bar: string }> = {
  load_reduction: { icon: IconTrendingDown, tone: "bg-warning-soft text-warning", bar: "bg-warning" },
  warning: { icon: IconAlertTriangle, tone: "bg-warning-soft text-warning", bar: "bg-warning" },
  termination: { icon: IconUserX, tone: "bg-danger-soft text-danger", bar: "bg-danger" },
};

const CP_STATUS_META = {
  active: { icon: IconClock, tone: "bg-warning-soft text-warning" },
  resolved: { icon: IconCircleCheck, tone: "bg-success-soft text-success" },
};

const FM_STATUS_META = {
  pending: { icon: IconClock, tone: "bg-warning-soft text-warning" },
  acknowledged: { icon: IconCircleCheck, tone: "bg-accent-soft text-accent" },
  resolved: { icon: IconCircleCheck, tone: "bg-success-soft text-success" },
};

const INCENTIVE_TYPE_ICON: Record<(typeof INCENTIVE_TYPES)[number], typeof IconCoin> = {
  monetary: IconCoin,
  title: IconTag,
  certificate: IconCertificate,
  training_trip: IconPlane,
  other: IconGift,
};

const INCENTIVE_STATUS_META = {
  active: { icon: IconCircleCheck, tone: "bg-success-soft text-success" },
  revoked: { icon: IconBan, tone: "bg-danger-soft text-danger" },
};

function initialsOf(name: string) {
  return name.charAt(0).toUpperCase();
}

type Tab = "correctionPlans" | "forceMajeure" | "incentives";

const NEW_HREF: Record<Tab, string> = {
  correctionPlans: "/dashboard/governance/correction-plans/new",
  forceMajeure: "/dashboard/governance/force-majeure/new",
  incentives: "/dashboard/governance/incentives/new",
};

export default function GovernanceWorkspace({
  employees,
  initialCorrectionPlans,
  initialForceMajeure,
  initialIncentives,
  viewerRole,
}: {
  employees: Employee[];
  initialCorrectionPlans: CorrectionPlan[];
  initialForceMajeure: ForceMajeureDeclaration[];
  initialIncentives: Incentive[];
  viewerRole: string;
}) {
  const locale = useLocale();
  const t = useTranslations("governance");
  const canManage = viewerRole === "super_admin" || viewerRole === "admin";

  const [tab, setTab] = useState<Tab>("correctionPlans");
  const [error, setError] = useState<string | null>(null);

  const [correctionPlans, setCorrectionPlans] = useState(initialCorrectionPlans);
  const [forceMajeure, setForceMajeure] = useState(initialForceMajeure);
  const [incentives, setIncentives] = useState(initialIncentives);

  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");

  const filteredCorrectionPlans = useMemo(
    () => (employeeFilter ? correctionPlans.filter((p) => String(p.user_id) === employeeFilter) : correctionPlans),
    [correctionPlans, employeeFilter],
  );
  const filteredForceMajeure = useMemo(
    () => (employeeFilter ? forceMajeure.filter((f) => String(f.affected_user_id) === employeeFilter) : forceMajeure),
    [forceMajeure, employeeFilter],
  );
  const filteredIncentives = useMemo(
    () => (employeeFilter ? incentives.filter((i) => String(i.user_id) === employeeFilter) : incentives),
    [incentives, employeeFilter],
  );

  const counts = useMemo(
    () => ({
      correctionPlans: correctionPlans.length,
      forceMajeure: forceMajeure.length,
      incentives: incentives.length,
    }),
    [correctionPlans, forceMajeure, incentives],
  );

  const stats = useMemo(
    () => ({
      total: correctionPlans.length + forceMajeure.length + incentives.length,
      activeCorrectionPlans: correctionPlans.filter((p) => p.status === "active").length,
      pendingForceMajeure: forceMajeure.filter((f) => f.status !== "resolved").length,
      activeIncentives: incentives.filter((i) => i.status === "active").length,
    }),
    [correctionPlans, forceMajeure, incentives],
  );

  const stageBreakdown = useMemo(
    () => ({
      load_reduction: correctionPlans.filter((p) => p.stage === "load_reduction").length,
      warning: correctionPlans.filter((p) => p.stage === "warning").length,
      termination: correctionPlans.filter((p) => p.stage === "termination").length,
    }),
    [correctionPlans],
  );

  const fmStatusBreakdown = useMemo(
    () => ({
      pending: forceMajeure.filter((f) => f.status === "pending").length,
      acknowledged: forceMajeure.filter((f) => f.status === "acknowledged").length,
      resolved: forceMajeure.filter((f) => f.status === "resolved").length,
    }),
    [forceMajeure],
  );

  const incentiveStatusBreakdown = useMemo(
    () => ({
      active: incentives.filter((i) => i.status === "active").length,
      revoked: incentives.filter((i) => i.status === "revoked").length,
    }),
    [incentives],
  );

  async function refreshAll() {
    const [cp, fm, inc] = await Promise.all([
      fetch("/api/v1/correction-plans", { headers: { "Accept-Language": locale }, credentials: "include", cache: "no-store" }),
      fetch("/api/v1/force-majeure", { headers: { "Accept-Language": locale }, credentials: "include", cache: "no-store" }),
      fetch("/api/v1/incentives", { headers: { "Accept-Language": locale }, credentials: "include", cache: "no-store" }),
    ]);
    if (cp.ok) setCorrectionPlans(await cp.json());
    if (fm.ok) setForceMajeure(await fm.json());
    if (inc.ok) setIncentives(await inc.json());
  }

  async function resolveCorrectionPlan(id: number) {
    setError(null);
    const res = await fetch(`/api/v1/correction-plans/${id}/resolve`, {
      method: "PATCH",
      headers: { "Accept-Language": locale },
      credentials: "include",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.detail ?? t("genericError"));
      return;
    }
    await refreshAll();
  }

  async function transitionForceMajeure(id: number, action: "acknowledge" | "resolve") {
    setError(null);
    const res = await fetch(`/api/v1/force-majeure/${id}/${action}`, {
      method: "PATCH",
      headers: { "Accept-Language": locale },
      credentials: "include",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.detail ?? t("genericError"));
      return;
    }
    await refreshAll();
  }

  async function confirmRevokeIncentive(id: number) {
    if (!revokeReason.trim()) return;
    setError(null);
    const res = await fetch(`/api/v1/incentives/${id}/revoke`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Accept-Language": locale },
      credentials: "include",
      body: JSON.stringify({ revoked_reason: revokeReason.trim() }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.detail ?? t("genericError"));
      return;
    }
    setRevokingId(null);
    setRevokeReason("");
    await refreshAll();
  }

  const employeeName = (id: number | null) => (id ? employees.find((e) => e.id === id)?.full_name : null);

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-lg border border-danger-soft bg-danger-soft px-3 py-2.5 text-sm text-danger">{error}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        <StatChip icon={IconClipboardText} label={t("totalRecordsCount")} value={stats.total} tone="text-text-2" />
        <StatChip icon={IconAlertTriangle} label={t("activeCorrectionPlansCount")} value={stats.activeCorrectionPlans} tone="text-warning" />
        <StatChip icon={IconCloudStorm} label={t("pendingForceMajeureCount")} value={stats.pendingForceMajeure} tone="text-warning" />
        <StatChip icon={IconGift} label={t("activeIncentivesCount")} value={stats.activeIncentives} tone="text-success" />
      </div>

      {stats.total > 0 && (
        <div className="grid gap-4 lg:grid-cols-3">
          <BreakdownDonutCard
            title={t("tabs.correctionPlans")}
            segments={[
              { label: t("stageValues.load_reduction"), value: stageBreakdown.load_reduction, colorVar: "var(--accent)" },
              { label: t("stageValues.warning"), value: stageBreakdown.warning, colorVar: "var(--warning)" },
              { label: t("stageValues.termination"), value: stageBreakdown.termination, colorVar: "var(--danger)" },
            ]}
          />
          <BreakdownDonutCard
            title={t("tabs.forceMajeure")}
            segments={[
              { label: t("fmStatusValues.pending"), value: fmStatusBreakdown.pending, colorVar: "var(--warning)" },
              { label: t("fmStatusValues.acknowledged"), value: fmStatusBreakdown.acknowledged, colorVar: "var(--accent)" },
              { label: t("fmStatusValues.resolved"), value: fmStatusBreakdown.resolved, colorVar: "var(--success)" },
            ]}
          />
          <BreakdownDonutCard
            title={t("tabs.incentives")}
            segments={[
              { label: t("incentiveStatusValues.active"), value: incentiveStatusBreakdown.active, colorVar: "var(--success)" },
              { label: t("incentiveStatusValues.revoked"), value: incentiveStatusBreakdown.revoked, colorVar: "var(--danger)" },
            ]}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <TabButton
          active={tab === "correctionPlans"}
          icon={IconClipboardText}
          label={t("tabs.correctionPlans")}
          count={counts.correctionPlans}
          onClick={() => setTab("correctionPlans")}
        />
        <TabButton
          active={tab === "forceMajeure"}
          icon={IconCloudStorm}
          label={t("tabs.forceMajeure")}
          count={counts.forceMajeure}
          onClick={() => setTab("forceMajeure")}
        />
        <TabButton
          active={tab === "incentives"}
          icon={IconGift}
          label={t("tabs.incentives")}
          count={counts.incentives}
          onClick={() => setTab("incentives")}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {canManage && (
          <Link
            href={NEW_HREF[tab]}
            className="flex w-fit items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-90 active:scale-[0.98]"
          >
            <IconPlus size={16} stroke={2.25} />
            {tab === "correctionPlans" && t("create")}
            {tab === "forceMajeure" && t("declare")}
            {tab === "incentives" && t("create")}
          </Link>
        )}
        <div className="ml-auto w-56">
          <IconField icon={IconUser}>
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="w-full bg-transparent text-sm text-text-1 outline-none"
            >
              <option value="">{t("allEmployees")}</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name}
                </option>
              ))}
            </select>
          </IconField>
        </div>
        {employeeFilter && (
          <button
            type="button"
            onClick={() => setEmployeeFilter("")}
            className="flex items-center gap-1.5 text-sm font-medium text-text-3 transition-colors hover:text-text-1"
          >
            <IconFilterOff size={15} stroke={1.75} />
            {t("clearFilters")}
          </button>
        )}
      </div>

      {tab === "correctionPlans" && (
        <div className="space-y-3">
          {filteredCorrectionPlans.length === 0 ? (
            <EmptyState icon={IconClipboardOff} text={correctionPlans.length === 0 ? t("noCorrectionPlans") : t("noResults")} />
          ) : (
            filteredCorrectionPlans.map((plan) => {
              const stageMeta = STAGE_META[plan.stage];
              const StageIcon = stageMeta.icon;
              const statusMeta = CP_STATUS_META[plan.status];
              const StatusIcon = statusMeta.icon;
              return (
                <div key={plan.id} className="flex overflow-hidden rounded-xl border border-border bg-surface shadow-soft transition-all hover:shadow-lg">
                  <div className={`w-1 shrink-0 ${stageMeta.bar}`} />
                  <div className="flex flex-1 flex-wrap items-start justify-between gap-3 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-xs font-bold text-accent">
                        {initialsOf(plan.user_full_name)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text-1">
                          {plan.user_full_name} <span className="text-text-3">· {plan.period}</span>
                        </p>
                        <span className={`mt-1 flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${stageMeta.tone}`}>
                          <StageIcon size={12} stroke={2} />
                          {t(`stageValues.${plan.stage}`)}
                          {plan.load_reduction_percent != null && ` · ${plan.load_reduction_percent}%`}
                        </span>
                        <p className="mt-1.5 text-xs text-text-2">{plan.reason}</p>
                        <p className="mt-1 text-xs text-text-3"><TimeAgo iso={plan.started_at} locale={locale} /></p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.tone}`}>
                        <StatusIcon size={12} stroke={2} />
                        {t(`statusValues.${plan.status}`)}
                      </span>
                      {canManage && plan.status === "active" && (
                        <button type="button" onClick={() => resolveCorrectionPlan(plan.id)} className="rounded-lg bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent transition-opacity hover:opacity-80">
                          {t("resolve")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === "forceMajeure" && (
        <div className="space-y-3">
          {filteredForceMajeure.length === 0 ? (
            <EmptyState icon={IconCloudOff} text={forceMajeure.length === 0 ? t("noForceMajeure") : t("noResults")} />
          ) : (
            filteredForceMajeure.map((decl) => {
              const statusMeta = FM_STATUS_META[decl.status];
              const StatusIcon = statusMeta.icon;
              const targetName = employeeName(decl.affected_user_id);
              return (
                <div key={decl.id} className="rounded-xl border border-border bg-surface p-4 shadow-soft transition-all hover:shadow-lg">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                        <IconCloudStorm size={17} stroke={1.75} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text-1">
                          {targetName ?? t("wholeOrganization")} <span className="text-text-3">· {decl.period}</span>
                        </p>
                        <span className="mt-1 flex w-fit items-center gap-1 rounded-full bg-surface-alt px-2 py-0.5 text-xs font-medium text-text-2">
                          {t(`categoryValues.${decl.category}`)}
                        </span>
                        <p className="mt-1.5 text-xs text-text-2">{decl.description}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-text-3">
                          <TimeAgo iso={decl.started_at} locale={locale} />
                          {decl.extension_days > 0 && (
                            <span className="flex items-center gap-1">
                              +{decl.extension_days} {t("extensionDays")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.tone}`}>
                        <StatusIcon size={12} stroke={2} />
                        {t(`fmStatusValues.${decl.status}`)}
                      </span>
                      {canManage && decl.status === "pending" && (
                        <button type="button" onClick={() => transitionForceMajeure(decl.id, "acknowledge")} className="rounded-lg bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent transition-opacity hover:opacity-80">
                          {t("acknowledge")}
                        </button>
                      )}
                      {canManage && decl.status !== "resolved" && (
                        <button type="button" onClick={() => transitionForceMajeure(decl.id, "resolve")} className="rounded-lg bg-success-soft px-3 py-1.5 text-xs font-semibold text-success transition-opacity hover:opacity-80">
                          {t("resolve")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === "incentives" && (
        <div className="space-y-3">
          {filteredIncentives.length === 0 ? (
            <EmptyState icon={IconGiftOff} text={incentives.length === 0 ? t("noIncentives") : t("noResults")} />
          ) : (
            filteredIncentives.map((inc) => {
              const statusMeta = INCENTIVE_STATUS_META[inc.status];
              const StatusIcon = statusMeta.icon;
              const TypeIcon = INCENTIVE_TYPE_ICON[inc.type];
              const isRevoking = revokingId === inc.id;
              return (
                <div key={inc.id} className="rounded-xl border border-border bg-surface p-4 shadow-soft transition-all hover:shadow-lg">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-xs font-bold text-accent">
                        {initialsOf(inc.user_full_name)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text-1">{inc.user_full_name}</p>
                        <span className="mt-1 flex w-fit items-center gap-1 rounded-full bg-surface-alt px-2 py-0.5 text-xs font-medium text-text-2">
                          <TypeIcon size={12} stroke={1.75} />
                          {inc.title}
                          {inc.amount != null && ` · ${inc.amount.toLocaleString()}`}
                        </span>
                        {inc.description && <p className="mt-1.5 text-xs text-text-2">{inc.description}</p>}
                        <p className="mt-1 text-xs text-text-3">
                          {inc.period} · <TimeAgo iso={inc.decided_at} locale={locale} />
                        </p>
                        {inc.status === "revoked" && inc.revoked_reason && (
                          <p className="mt-1.5 flex items-start gap-1 text-xs text-danger">
                            <IconBan size={12} stroke={2} className="mt-0.5 shrink-0" />
                            {inc.revoked_reason}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.tone}`}>
                        <StatusIcon size={12} stroke={2} />
                        {t(`incentiveStatusValues.${inc.status}`)}
                      </span>
                      {canManage && inc.status === "active" && !isRevoking && (
                        <button
                          type="button"
                          onClick={() => {
                            setRevokingId(inc.id);
                            setRevokeReason("");
                          }}
                          className="rounded-lg bg-danger-soft px-3 py-1.5 text-xs font-semibold text-danger transition-opacity hover:opacity-80"
                        >
                          {t("revoke")}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid transition-[grid-template-rows] duration-300 ease-out" style={{ gridTemplateRows: isRevoking ? "1fr" : "0fr" }}>
                    <div className="overflow-hidden">
                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                        <div className="group flex flex-1 items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2 transition-all focus-within:border-danger focus-within:ring-2 focus-within:ring-danger-soft">
                          <IconMessage2 size={14} stroke={1.75} className="shrink-0 text-text-3" />
                          <input
                            autoFocus={isRevoking}
                            value={revokeReason}
                            onChange={(e) => setRevokeReason(e.target.value)}
                            placeholder={t("revokeReasonPrompt")}
                            className="w-full bg-transparent text-xs text-text-1 outline-none placeholder:text-text-3"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={!revokeReason.trim()}
                          onClick={() => confirmRevokeIncentive(inc.id)}
                          className="rounded-lg bg-danger px-3 py-2 text-xs font-semibold text-white transition-all hover:brightness-90 disabled:opacity-50"
                        >
                          {t("revoke")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRevokingId(null)}
                          aria-label={t("cancel")}
                          className="rounded-lg p-2 text-text-3 hover:text-text-1"
                        >
                          <IconX size={14} stroke={2} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  icon: Icon,
  label,
  count,
  onClick,
}: {
  active: boolean;
  icon: typeof IconGift;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
        active ? "bg-accent text-white shadow-sm" : "bg-surface-alt text-text-2 hover:text-text-1"
      }`}
    >
      <Icon size={14} stroke={1.75} />
      {label}
      <span className={`rounded-full px-1.5 text-[0.65rem] tabular-nums ${active ? "bg-white/20" : "bg-surface text-text-3"}`}>{count}</span>
    </button>
  );
}

function EmptyState({ icon: Icon, text }: { icon: typeof IconGift; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-surface px-6 py-14 text-center">
      <Icon size={32} stroke={1.5} className="text-text-3" />
      <p className="text-sm font-semibold text-text-1">{text}</p>
    </div>
  );
}
