"use client";

import { IconCrown, IconGauge, IconMedal, IconStack3, IconStar, IconTrophy, IconUsersGroup } from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import StatCard from "@/components/dashboard/StatCard";
import type { LeaderboardRow } from "@/lib/dashboard";
import type { KpiTemplate } from "@/lib/kpiTemplates";

const RANK_META = [
  { icon: IconCrown, tone: "bg-[#f5b301] text-white", ring: "ring-2 ring-[#f5b301]" },
  { icon: IconMedal, tone: "bg-[#9aa4b2] text-white", ring: "ring-2 ring-[#9aa4b2]" },
  { icon: IconMedal, tone: "bg-[#c9834a] text-white", ring: "ring-2 ring-[#c9834a]" },
];

export default function LeaderboardTable({
  templates,
  initialTemplateId,
  initialPeriod,
  initialRows,
  currentUserId,
}: {
  templates: KpiTemplate[];
  initialTemplateId: number;
  initialPeriod: string;
  initialRows: LeaderboardRow[];
  currentUserId: number;
}) {
  const locale = useLocale();
  const t = useTranslations("leaderboard");

  const [templateId, setTemplateId] = useState<string>(String(initialTemplateId));
  const [period, setPeriod] = useState(initialPeriod);
  const [rows, setRows] = useState<LeaderboardRow[]>(initialRows);
  const [loading, setLoading] = useState(false);

  const selectedTemplate = templates.find((tpl) => String(tpl.id) === templateId);
  const academicYears = useMemo(
    () => Array.from(new Set(templates.map((tpl) => tpl.academic_year))).sort().reverse(),
    [templates],
  );

  async function load(nextTemplateId: string, nextPeriod: string) {
    if (!nextTemplateId || !nextPeriod) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/dashboard/leaderboard?kpi_template_id=${nextTemplateId}&period=${nextPeriod}`, {
        headers: { "Accept-Language": locale },
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) setRows(await res.json());
    } finally {
      setLoading(false);
    }
  }

  const topScore = rows.length ? rows[0].total_score : null;
  const averageScore = rows.length
    ? Math.round((rows.reduce((sum, r) => sum + r.total_score, 0) / rows.length) * 10) / 10
    : null;
  const yourIndex = rows.findIndex((r) => r.user_id === currentUserId);

  return (
    <div className="space-y-4">
      {rows.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title={t("participants")} value={String(rows.length)} icon={IconUsersGroup} />
          <StatCard title={t("topScore")} value={topScore != null ? `${topScore}` : "—"} icon={IconTrophy} tone="warning" />
          <StatCard title={t("averageScore")} value={averageScore != null ? `${averageScore}` : "—"} icon={IconGauge} tone="success" />
          <StatCard
            title={t("yourRank")}
            value={yourIndex >= 0 ? `#${yourIndex + 1}` : "—"}
            icon={IconStar}
            tone={yourIndex >= 0 && yourIndex < 3 ? "warning" : "accent"}
          />
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-2">{t("annex")}</label>
          <div className="group flex items-center gap-2 rounded-xl border border-border bg-bg px-3.5 py-2.5 transition-all focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft">
            <IconStack3 size={16} stroke={1.75} className="shrink-0 text-text-3 transition-colors group-focus-within:text-accent" />
            <select
              value={templateId}
              onChange={(e) => {
                const nextId = e.target.value;
                setTemplateId(nextId);
                const tpl = templates.find((t2) => String(t2.id) === nextId);
                const nextPeriod = tpl?.academic_year ?? period;
                setPeriod(nextPeriod);
                load(nextId, nextPeriod);
              }}
              className="bg-transparent text-sm text-text-1 outline-none"
            >
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.annex_code}-{t("annexLabel")}: {tpl.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-2">{t("period")}</label>
          <div className="group flex items-center gap-2 rounded-xl border border-border bg-bg px-3.5 py-2.5 transition-all focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft">
            <select
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value);
                load(templateId, e.target.value);
              }}
              className="w-32 bg-transparent text-sm text-text-1 outline-none"
            >
              {academicYears.length === 0 && <option value={period}>{period}</option>}
              {academicYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
        {loading && <span className="text-xs text-text-3">{t("loading")}</span>}
        {selectedTemplate && (
          <span className="ml-auto text-xs text-text-3">
            {selectedTemplate.annex_code}-{t("annexLabel")} · {period}
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-surface px-6 py-14 text-center">
          <IconTrophy size={32} stroke={1.5} className="text-text-3" />
          <p className="text-sm font-semibold text-text-1">{t("noResults")}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {rows.map((row, index) => {
            const percent = row.template_max_score > 0 ? (row.total_score / row.template_max_score) * 100 : 0;
            const podium = RANK_META[index];
            const RankIcon = podium?.icon;
            const isSelf = row.user_id === currentUserId;
            return (
              <div
                key={row.user_id}
                className={`flex flex-wrap items-center gap-4 rounded-xl border bg-surface p-4 shadow-soft transition-all hover:shadow-lg ${
                  podium ? `border-transparent ${podium.ring}` : isSelf ? "border-accent" : "border-border"
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                    podium ? podium.tone : "bg-surface-alt text-text-2"
                  }`}
                >
                  {RankIcon ? <RankIcon size={17} stroke={1.75} /> : index + 1}
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-xs font-bold text-accent">
                  {row.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-[10rem] flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-text-1">
                    {row.full_name}
                    {isSelf && (
                      <span className="flex items-center gap-0.5 rounded-full bg-accent-soft px-1.5 py-0.5 text-[0.65rem] font-semibold text-accent">
                        <IconStar size={10} stroke={2} />
                        {t("yourRank")}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-text-3">
                    {row.department_name ?? "—"}
                    {row.position_title ? ` · ${row.position_title}` : ""}
                  </p>
                </div>
                <div className="flex min-w-[10rem] flex-1 items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-alt">
                    <div
                      className={`h-full rounded-full transition-[width] duration-700 ease-out ${podium ? "bg-gradient-to-r from-accent to-[#3646c9]" : "bg-accent"}`}
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>
                  <span className="w-14 shrink-0 text-right text-sm font-bold text-text-1 tabular-nums">{row.total_score}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
