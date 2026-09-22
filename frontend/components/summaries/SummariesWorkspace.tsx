"use client";

import {
  IconAlertTriangle,
  IconCalendarStats,
  IconChevronDown,
  IconClipboardCheck,
  IconGauge,
  IconReportAnalytics,
  IconSparkles,
} from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import BreakdownDonutCard from "@/components/dashboard/BreakdownDonutCard";
import RankingBarChart from "@/components/dashboard/RankingBarChart";
import StatCard from "@/components/dashboard/StatCard";
import type { Summary, SummaryType } from "@/lib/summaries";
import FormSection from "@/components/ui/FormSection";

type SemesterPayload = {
  period: string;
  half: number;
  total_employees_evaluated: number;
  organization_average_score: number | null;
  department_averages: { department_id: number; department_name: string; average_score: number; employee_count: number }[];
};

type YearEndPayload = {
  academic_year: string;
  ranking: { user_id: number; full_name: string; total_score: number | null }[];
  work_plan_fulfillment: { under: number; met: number; exceeded: number };
  correction_plans_active: number;
  correction_plans_resolved: number;
};

type EarlyWarningPayload = {
  period: string;
  flagged_count: number;
  flagged: { user_id: number; full_name: string; position_title: string; minimal_score: number; current_score: number }[];
};

export default function SummariesWorkspace({
  initialSummaries,
  academicYears,
}: {
  initialSummaries: Summary[];
  academicYears: string[];
}) {
  const locale = useLocale();
  const t = useTranslations("summaries");

  const [summaries, setSummaries] = useState(initialSummaries);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState<SummaryType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [semesterPeriod, setSemesterPeriod] = useState(academicYears[0] ?? "");
  const [semesterHalf, setSemesterHalf] = useState<1 | 2>(1);
  const [yearEndYear, setYearEndYear] = useState(academicYears[0] ?? "");
  const [warningPeriod, setWarningPeriod] = useState(academicYears[0] ?? "");

  const latestOfType = useMemo(() => {
    const byType: Partial<Record<SummaryType, Summary>> = {};
    for (const s of summaries) {
      const current = byType[s.type];
      if (!current || new Date(s.generated_at) > new Date(current.generated_at)) byType[s.type] = s;
    }
    return byType;
  }, [summaries]);

  const latestSemester = latestOfType.semester_review?.payload as unknown as SemesterPayload | undefined;
  const latestYearEnd = latestOfType.year_end?.payload as unknown as YearEndPayload | undefined;
  const latestWarning = latestOfType.early_warning?.payload as unknown as EarlyWarningPayload | undefined;

  function toggleExpanded(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function refresh() {
    const res = await fetch("/api/v1/summaries", {
      headers: { "Accept-Language": locale },
      credentials: "include",
      cache: "no-store",
    });
    if (res.ok) setSummaries(await res.json());
  }

  async function generate(type: SummaryType, body: Record<string, unknown>) {
    setError(null);
    setBusy(type);
    try {
      const endpoint = type === "semester_review" ? "semester-review" : type === "year_end" ? "year-end" : "early-warning";
      const res = await fetch(`/api/v1/summaries/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept-Language": locale },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => null);
        setError(b?.detail ?? t("genericError"));
        return;
      }
      const created = (await res.json()) as Summary;
      await refresh();
      setExpanded((prev) => new Set(prev).add(created.id));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-lg border border-danger-soft bg-danger-soft px-3 py-2.5 text-sm text-danger">{error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title={t("totalGenerated")} value={String(summaries.length)} icon={IconClipboardCheck} />
        <StatCard
          title={t("latestOrgAverage")}
          value={latestSemester?.organization_average_score != null ? `${latestSemester.organization_average_score}%` : "—"}
          hint={latestOfType.semester_review?.period}
          icon={IconGauge}
          tone="success"
        />
        <StatCard
          title={t("activeWarnings")}
          value={latestWarning ? String(latestWarning.flagged_count) : "—"}
          hint={latestOfType.early_warning?.period}
          icon={IconAlertTriangle}
          tone={latestWarning && latestWarning.flagged_count > 0 ? "danger" : "success"}
        />
        <StatCard
          title={t("workPlanExceeded")}
          value={latestYearEnd ? String(latestYearEnd.work_plan_fulfillment.exceeded) : "—"}
          hint={latestOfType.year_end?.period}
          icon={IconReportAnalytics}
          tone="warning"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <FormSection icon={IconCalendarStats} title={t("semesterReview")}>
          <div className="space-y-2.5">
            <select
              value={semesterPeriod}
              onChange={(e) => setSemesterPeriod(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-1 outline-none focus:border-accent"
            >
              {academicYears.length === 0 && <option value="">—</option>}
              {academicYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              {[1, 2].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setSemesterHalf(h as 1 | 2)}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    semesterHalf === h ? "bg-accent-soft text-accent" : "bg-surface-alt text-text-3"
                  }`}
                >
                  {t("half", { half: h })}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={!semesterPeriod || busy === "semester_review"}
              onClick={() => generate("semester_review", { period: semesterPeriod, half: semesterHalf })}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-90 active:scale-[0.98] disabled:opacity-50"
            >
              <IconSparkles size={15} stroke={2} />
              {busy === "semester_review" ? t("generating") : t("generate")}
            </button>
          </div>
        </FormSection>

        <FormSection icon={IconReportAnalytics} title={t("yearEnd")}>
          <div className="space-y-2.5">
            <select
              value={yearEndYear}
              onChange={(e) => setYearEndYear(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-1 outline-none focus:border-accent"
            >
              {academicYears.length === 0 && <option value="">—</option>}
              {academicYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!yearEndYear || busy === "year_end"}
              onClick={() => generate("year_end", { academic_year: yearEndYear })}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-90 active:scale-[0.98] disabled:opacity-50"
            >
              <IconSparkles size={15} stroke={2} />
              {busy === "year_end" ? t("generating") : t("generate")}
            </button>
          </div>
        </FormSection>

        <FormSection icon={IconAlertTriangle} title={t("earlyWarning")}>
          <div className="space-y-2.5">
            <select
              value={warningPeriod}
              onChange={(e) => setWarningPeriod(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-1 outline-none focus:border-accent"
            >
              {academicYears.length === 0 && <option value="">—</option>}
              {academicYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!warningPeriod || busy === "early_warning"}
              onClick={() => generate("early_warning", { period: warningPeriod })}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-warning px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-90 active:scale-[0.98] disabled:opacity-50"
            >
              <IconSparkles size={15} stroke={2} />
              {busy === "early_warning" ? t("generating") : t("generate")}
            </button>
          </div>
        </FormSection>
      </div>

      <div className="space-y-3">
        <h2 className="px-1 text-sm font-semibold text-text-1">{t("history")}</h2>
        {summaries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-surface px-6 py-14 text-center text-sm text-text-3">
            {t("noSummaries")}
          </p>
        ) : (
          summaries.map((s) => {
            const isOpen = expanded.has(s.id);
            return (
              <div key={s.id} className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
                <button
                  type="button"
                  onClick={() => toggleExpanded(s.id)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <IconClipboardCheck size={16} stroke={1.75} className="text-text-3" />
                    <div>
                      <p className="text-sm font-semibold text-text-1">
                        {t(`typeLabel.${s.type}`)} · {s.period}
                        {s.half ? ` (${t("half", { half: s.half })})` : ""}
                      </p>
                      <p className="text-xs text-text-3">
                        {t("generatedBy", { name: s.generated_by_name })} ·{" "}
                        {new Date(s.generated_at).toLocaleDateString(locale)}
                      </p>
                    </div>
                  </div>
                  <IconChevronDown
                    size={16}
                    stroke={2}
                    className={`shrink-0 text-text-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-border p-4">
                    <SummaryPayloadView type={s.type} payload={s.payload} t={t} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function SummaryPayloadView({
  type,
  payload,
  t,
}: {
  type: SummaryType;
  payload: Record<string, unknown>;
  t: ReturnType<typeof useTranslations>;
}) {
  if (type === "semester_review") {
    const p = payload as unknown as SemesterPayload;
    return (
      <div className="space-y-4">
        <div className="flex gap-4 text-sm">
          <span className="text-text-2">
            {t("totalEvaluated")}: <b className="text-text-1">{p.total_employees_evaluated}</b>
          </span>
          <span className="text-text-2">
            {t("orgAverage")}: <b className="text-text-1">{p.organization_average_score ?? "—"}</b>
          </span>
        </div>
        {p.department_averages.length > 0 && (
          <RankingBarChart
            rows={p.department_averages.map((d) => ({ name: d.department_name, value: d.average_score, hasData: true }))}
          />
        )}
      </div>
    );
  }

  if (type === "year_end") {
    const p = payload as unknown as YearEndPayload;
    const rankingMax = Math.max(...p.ranking.map((r) => r.total_score ?? 0), 1);
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="text-text-2">
            {t("correctionPlansActive")}: <b className="text-text-1">{p.correction_plans_active}</b>
          </span>
          <span className="text-text-2">
            {t("correctionPlansResolved")}: <b className="text-text-1">{p.correction_plans_resolved}</b>
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <BreakdownDonutCard
            title={t("workPlanFulfillment")}
            segments={[
              { label: t("workPlanMet"), value: p.work_plan_fulfillment.met, colorVar: "var(--success)" },
              { label: t("workPlanExceeded"), value: p.work_plan_fulfillment.exceeded, colorVar: "var(--accent)" },
              { label: t("workPlanUnder"), value: p.work_plan_fulfillment.under, colorVar: "var(--warning)" },
            ]}
          />
          <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
            <p className="mb-4 text-sm font-semibold text-text-1">{t("topRanking")}</p>
            {p.ranking.length === 0 ? (
              <p className="text-sm text-text-3">{t("noRanking")}</p>
            ) : (
              <RankingBarChart
                max={rankingMax}
                rows={p.ranking.slice(0, 10).map((r) => ({ name: r.full_name, value: r.total_score ?? 0, hasData: r.total_score != null }))}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  const p = payload as unknown as EarlyWarningPayload;
  return (
    <div className="space-y-2">
      <p className="text-sm text-text-2">{t("flaggedCount", { count: p.flagged_count })}</p>
      {p.flagged.map((f) => (
        <div key={f.user_id} className="flex items-center justify-between rounded-lg bg-danger-soft px-3 py-2 text-xs">
          <span className="text-danger">
            {f.full_name} · {f.position_title}
          </span>
          <span className="font-semibold text-danger tabular-nums">
            {f.current_score} / {f.minimal_score}
          </span>
        </div>
      ))}
    </div>
  );
}
