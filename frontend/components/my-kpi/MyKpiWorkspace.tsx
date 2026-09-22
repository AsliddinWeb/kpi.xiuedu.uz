"use client";

import {
  IconAlertTriangle,
  IconCalendar,
  IconCircleCheck,
  IconCircleX,
  IconClock,
  IconClockHour4,
  IconFileText,
  IconFolderOpen,
  IconLayoutGrid,
  IconShieldCheck,
  IconStack3,
  IconUpload,
  IconUserCheck,
  IconX,
} from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState, type FormEvent } from "react";
import BreakdownDonutCard from "@/components/dashboard/BreakdownDonutCard";
import ScoreDonutCard from "@/components/dashboard/ScoreDonutCard";
import StatCard from "@/components/dashboard/StatCard";
import type { MyKpiIndicatorRow, MyKpiSubmissionRow } from "@/lib/dashboard";
import type { KpiTemplate } from "@/lib/kpiTemplates";

const CATEGORY_COLORS = ["var(--accent)", "var(--success)", "var(--warning)", "var(--danger)", "#8b5cf6", "#0ea5e9"];

const STATUS_META: Record<string, { icon: typeof IconClock; tone: string }> = {
  submitted: { icon: IconClock, tone: "bg-warning-soft text-warning" },
  kafedra_endorsed: { icon: IconShieldCheck, tone: "bg-accent-soft text-accent" },
  scored: { icon: IconCircleCheck, tone: "bg-success-soft text-success" },
  pending_head_approval: { icon: IconUserCheck, tone: "bg-warning-soft text-warning" },
  approved: { icon: IconCircleCheck, tone: "bg-success-soft text-success" },
  rejected: { icon: IconCircleX, tone: "bg-danger-soft text-danger" },
};

export default function MyKpiWorkspace({
  template,
  initialPeriod,
  initialRows,
}: {
  template: KpiTemplate;
  initialPeriod: string;
  initialRows: MyKpiIndicatorRow[];
}) {
  const locale = useLocale();
  const t = useTranslations("myKpi");
  const dashT = useTranslations("dashboard");
  const periodT = useTranslations("setup.period");

  const [period, setPeriod] = useState(initialPeriod);
  const [rows, setRows] = useState<MyKpiIndicatorRow[]>(initialRows);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);
  const [openIndicatorId, setOpenIndicatorId] = useState<number | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const totals = useMemo(() => {
    const awarded = rows.reduce((sum, r) => sum + r.awarded_total, 0);
    const max = rows.reduce((sum, r) => sum + r.max_score, 0);
    return { awarded: Math.round(awarded * 10) / 10, max };
  }, [rows]);

  const groups = useMemo(() => {
    const map = new Map<number, { id: number; name: string; maxScore: number; rows: MyKpiIndicatorRow[] }>();
    for (const row of rows) {
      if (!map.has(row.category_id)) {
        map.set(row.category_id, { id: row.category_id, name: row.category_name, maxScore: row.category_max_score, rows: [] });
      }
      map.get(row.category_id)!.rows.push(row);
    }
    return Array.from(map.values());
  }, [rows]);

  const allSubmissions = useMemo(() => rows.flatMap((r) => r.submissions), [rows]);
  const pendingCount = useMemo(
    () => allSubmissions.filter((s) => s.status === "submitted" || s.status === "kafedra_endorsed" || s.status === "pending_head_approval").length,
    [allSubmissions],
  );
  const rejectedCount = useMemo(() => allSubmissions.filter((s) => s.status === "rejected").length, [allSubmissions]);
  const completedCount = useMemo(() => rows.filter((r) => r.remaining_capacity <= 0 && r.awarded_total > 0).length, [rows]);

  async function loadRows(nextPeriod: string) {
    if (!nextPeriod) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/dashboard/my-kpi?period=${nextPeriod}`, {
        headers: { "Accept-Language": locale },
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) setRows(await res.json());
    } finally {
      setLoading(false);
    }
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function submitAriza(e: FormEvent, indicatorId: number) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("kpi_indicator_id", String(indicatorId));
      formData.set("period", period);
      if (comment.trim()) formData.set("employee_comment", comment.trim());
      files.forEach((file) => formData.append("files", file));

      const res = await fetch("/api/v1/arizalar", {
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
      setOpenIndicatorId(null);
      setFiles([]);
      setComment("");
      await loadRows(period);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <p className="rounded-lg border border-danger-soft bg-danger-soft px-3 py-2.5 text-sm text-danger">{error}</p>
      )}

      <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-sm font-bold text-accent">
            {template.annex_code}
          </div>
          <div>
            <p className="text-sm font-semibold text-text-1">{template.name}</p>
            <p className="text-xs text-text-3">
              {template.annex_code}-{t("annex")} · {template.academic_year} · {periodT(template.period_type)}
            </p>
          </div>
        </div>

        <div className="mt-3 border-t border-border pt-3">
          {showPeriodPicker ? (
            <div className="flex flex-wrap items-end gap-2">
              <div className="group flex items-center gap-2 rounded-xl border border-border bg-bg px-3.5 py-2.5 transition-all focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft">
                <IconCalendar size={16} stroke={1.75} className="shrink-0 text-text-3 transition-colors group-focus-within:text-accent" />
                <input
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  placeholder="2026-2027"
                  className="w-32 bg-transparent text-sm text-text-1 outline-none placeholder:text-text-3"
                />
              </div>
              <button
                type="button"
                onClick={() => loadRows(period)}
                disabled={!period || loading}
                className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-90 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? t("loading") : t("load")}
              </button>
              <button
                type="button"
                onClick={() => setShowPeriodPicker(false)}
                className="px-2 py-2.5 text-sm font-medium text-text-3 transition-colors hover:text-text-1"
              >
                {t("cancel")}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowPeriodPicker(true)}
              className="text-xs font-medium text-accent transition-opacity hover:opacity-75"
            >
              {t("changePeriod")} ({period})
            </button>
          )}
        </div>
      </div>

      {totals.max > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title={t("categoriesCount")} value={String(groups.length)} icon={IconLayoutGrid} />
            <StatCard title={t("completedIndicators")} value={String(completedCount)} icon={IconCircleCheck} tone="success" />
            <StatCard
              title={t("pendingSubmissions")}
              value={String(pendingCount)}
              icon={IconClockHour4}
              tone={pendingCount > 0 ? "warning" : "success"}
            />
            <StatCard
              title={t("rejectedSubmissions")}
              value={String(rejectedCount)}
              icon={IconCircleX}
              tone={rejectedCount > 0 ? "danger" : "success"}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ScoreDonutCard
              title={t("totalProgress")}
              percent={totals.max > 0 ? (totals.awarded / totals.max) * 100 : 0}
              label={`${totals.awarded} / ${totals.max}`}
            />
            <BreakdownDonutCard
              title={dashT("categoryBreakdown")}
              segments={groups.map((g, i) => ({
                label: g.name,
                value: Math.round(g.rows.reduce((sum, r) => sum + r.awarded_total, 0) * 10) / 10,
                colorVar: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
              }))}
            />
          </div>
        </>
      )}

      {groups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface px-6 py-14 text-center text-sm text-text-3">
          {t("noIndicators")}
        </p>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => {
            const groupAwarded = group.rows.reduce((sum, r) => sum + r.awarded_total, 0);
            return (
              <div key={group.id} className="space-y-2.5">
                <div className="flex items-center gap-2 px-1">
                  <IconFolderOpen size={15} stroke={1.75} className="text-text-3" />
                  <h2 className="text-sm font-semibold text-text-1">{group.name}</h2>
                  <span className="ml-auto text-xs font-semibold text-text-3 tabular-nums">
                    {Math.round(groupAwarded * 10) / 10} / {group.maxScore}
                  </span>
                </div>

                {group.rows.map((row) => {
                  const percent = row.max_score > 0 ? (row.awarded_total / row.max_score) * 100 : 0;
                  const canSubmit = row.remaining_capacity > 0;
                  const latestRejected = row.submissions[0]?.status === "rejected" ? row.submissions[0] : null;
                  return (
                    <div
                      key={row.kpi_indicator_id}
                      className="rounded-xl border border-border bg-surface p-4 shadow-soft transition-all hover:shadow-lg"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <IconStack3 size={14} stroke={1.75} className="shrink-0 text-text-3" />
                          <p className="text-sm font-semibold text-text-1">{row.indicator_name}</p>
                        </div>
                        <span className="flex items-center gap-1 rounded-full bg-surface-alt px-2.5 py-1 text-xs font-semibold text-text-3">
                          {row.submissions.length > 0
                            ? t("submissionHistory") + ": " + row.submissions.length
                            : t("statusValues.notSubmitted")}
                        </span>
                      </div>

                      <div className="mt-2.5">
                        <div className="flex items-center justify-between text-xs text-text-3">
                          <span>{t("score")}</span>
                          <span className="font-semibold text-text-1 tabular-nums">
                            {row.awarded_total} / {row.max_score}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-alt">
                          <div
                            className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        {!canSubmit && (
                          <p className="mt-1 text-[0.7rem] text-text-3">{t("fullyCovered")}</p>
                        )}
                      </div>

                      {row.submissions.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {row.submissions.map((sub: MyKpiSubmissionRow) => {
                            const meta = STATUS_META[sub.status];
                            return (
                              <div
                                key={sub.ariza_id}
                                className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-xs"
                              >
                                <span
                                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${
                                    meta ? meta.tone : "bg-surface-alt text-text-3"
                                  }`}
                                >
                                  {meta && <meta.icon size={12} stroke={2} />}
                                  {t(`statusValues.${sub.status}`)}
                                </span>
                                <span className="font-semibold text-text-1 tabular-nums">
                                  {sub.awarded_score ?? "—"}
                                </span>
                                {sub.employee_comment && (
                                  <span className="text-text-3">— {sub.employee_comment}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {latestRejected?.reviewer_comment && (
                        <div className="mt-3 rounded-lg border border-danger-soft bg-danger-soft px-3 py-2.5">
                          <p className="flex items-start gap-1.5 text-xs text-danger">
                            <IconAlertTriangle size={14} stroke={1.75} className="mt-0.5 shrink-0" />
                            <span>
                              <span className="font-semibold">{t("reviewerComment")}:</span>{" "}
                              {latestRejected.reviewer_comment}
                            </span>
                          </p>
                          <p className="mt-1 pl-[1.375rem] text-xs text-text-3">{t("resubmitHint")}</p>
                        </div>
                      )}

                      {canSubmit && (
                        <div className="mt-3">
                          {openIndicatorId === row.kpi_indicator_id ? (
                            <form onSubmit={(e) => submitAriza(e, row.kpi_indicator_id)} className="space-y-2.5">
                              <label
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  addFiles(e.dataTransfer.files);
                                }}
                                className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-border bg-bg px-4 py-6 text-center transition-colors hover:border-accent"
                              >
                                <IconUpload size={20} stroke={1.5} className="text-text-3" />
                                <span className="text-xs text-text-2">{t("dropFilesHint")}</span>
                                <input type="file" multiple onChange={(e) => addFiles(e.target.files)} className="hidden" />
                              </label>

                              {files.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {files.map((file, i) => (
                                    <span
                                      key={i}
                                      className="flex items-center gap-1.5 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-xs text-text-2"
                                    >
                                      <IconFileText size={13} stroke={1.75} />
                                      <span className="max-w-[9rem] truncate">{file.name}</span>
                                      <button
                                        type="button"
                                        onClick={() => removeFile(i)}
                                        aria-label={t("removeFile")}
                                        className="text-text-3 hover:text-danger"
                                      >
                                        <IconX size={13} stroke={2} />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}

                              <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder={t("employeeCommentPlaceholder")}
                                rows={2}
                                className="w-full resize-none rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text-1 outline-none placeholder:text-text-3 focus:border-accent focus:ring-4 focus:ring-accent-soft"
                              />

                              <div className="flex items-center gap-2">
                                <button
                                  type="submit"
                                  disabled={submitting}
                                  className="rounded-lg bg-accent px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-90 active:scale-[0.98] disabled:opacity-50"
                                >
                                  {submitting ? t("submitting") : t("submit")}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenIndicatorId(null);
                                    setFiles([]);
                                    setComment("");
                                  }}
                                  className="text-xs font-medium text-text-3 transition-colors hover:text-text-1"
                                >
                                  {t("cancel")}
                                </button>
                              </div>
                            </form>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setOpenIndicatorId(row.kpi_indicator_id)}
                              className="rounded-lg bg-accent-soft px-3.5 py-1.5 text-xs font-medium text-accent transition-opacity hover:opacity-80"
                            >
                              {row.submissions.length > 0 ? t("addSubmission") : t("submitAriza")}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
