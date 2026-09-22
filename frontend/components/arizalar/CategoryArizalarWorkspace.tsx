"use client";

import {
  IconArrowLeft,
  IconCalendar,
  IconCircleCheck,
  IconCircleX,
  IconClipboardList,
  IconClock,
  IconFilterOff,
  IconInbox,
  IconSearch,
} from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Ariza, ArizaStatus } from "@/lib/arizalar";
import IconField from "@/components/ui/IconField";
import ArizaCard from "./ArizaCard";

const TABS: { key: "all" | ArizaStatus; labelKey: string }[] = [
  { key: "all", labelKey: "all" },
  { key: "submitted", labelKey: "statusValues.submitted" },
  { key: "pending_head_approval", labelKey: "statusValues.pending_head_approval" },
  { key: "scored", labelKey: "statusValues.scored" },
  { key: "approved", labelKey: "statusValues.approved" },
  { key: "rejected", labelKey: "statusValues.rejected" },
];

function StatChip({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof IconClipboardList;
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

export default function CategoryArizalarWorkspace({
  categoryName,
  initialArizalar,
  indicatorOrder,
}: {
  categoryName: string;
  initialArizalar: Ariza[];
  indicatorOrder: Record<number, number>;
}) {
  const locale = useLocale();
  const t = useTranslations("arizalar");

  const [arizalar, setArizalar] = useState(initialArizalar);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scoreDrafts, setScoreDrafts] = useState<Record<number, string>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  const counts = useMemo(() => {
    const map: Partial<Record<ArizaStatus, number>> = {};
    for (const a of arizalar) map[a.status] = (map[a.status] ?? 0) + 1;
    return map;
  }, [arizalar]);

  const stats = useMemo(
    () => ({
      total: arizalar.length,
      pending: (counts.submitted ?? 0) + (counts.kafedra_endorsed ?? 0),
      scored: counts.scored ?? 0,
      rejected: counts.rejected ?? 0,
    }),
    [arizalar, counts],
  );

  const periodOptions = useMemo(() => Array.from(new Set(arizalar.map((a) => a.period))).sort(), [arizalar]);
  const hasActiveFilters = !!(search || periodFilter);

  const filtered = useMemo(() => {
    return arizalar.filter((a) => {
      if (tab !== "all" && a.status !== tab) return false;
      if (search && !a.user_full_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (periodFilter && a.period !== periodFilter) return false;
      return true;
    });
  }, [arizalar, tab, search, periodFilter]);

  const indicators = useMemo(() => {
    const byIndicator = new Map<number, { id: number; name: string; items: Ariza[] }>();
    for (const a of filtered) {
      if (!byIndicator.has(a.kpi_indicator_id)) {
        byIndicator.set(a.kpi_indicator_id, { id: a.kpi_indicator_id, name: a.indicator_name, items: [] });
      }
      byIndicator.get(a.kpi_indicator_id)!.items.push(a);
    }
    const groups = Array.from(byIndicator.values()).sort(
      (x, y) => (indicatorOrder[x.id] ?? 999) - (indicatorOrder[y.id] ?? 999),
    );
    for (const group of groups) {
      group.items.sort((x, y) => new Date(y.submitted_at).getTime() - new Date(x.submitted_at).getTime());
    }
    return groups;
  }, [filtered, indicatorOrder]);

  function clearFilters() {
    setSearch("");
    setPeriodFilter("");
  }

  async function refresh() {
    const res = await fetch("/api/v1/arizalar", {
      headers: { "Accept-Language": locale },
      credentials: "include",
      cache: "no-store",
    });
    if (res.ok) {
      const all: Ariza[] = await res.json();
      setArizalar(all.filter((a) => a.category_name === categoryName));
    }
  }

  async function scoreAriza(id: number) {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/v1/arizalar/${id}/score`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Accept-Language": locale },
        credentials: "include",
        body: JSON.stringify({
          awarded_score: Number(scoreDrafts[id]) || 0,
          reviewer_comment: commentDrafts[id]?.trim() || null,
        }),
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

  async function rejectAriza(id: number) {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/v1/arizalar/${id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Accept-Language": locale },
        credentials: "include",
        body: JSON.stringify({ reviewer_comment: commentDrafts[id]?.trim() || t("rejected") }),
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

  async function headApproveAriza(id: number) {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/v1/arizalar/${id}/head-approve`, {
        method: "PATCH",
        headers: { "Accept-Language": locale },
        credentials: "include",
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

  async function headRejectAriza(id: number) {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/v1/arizalar/${id}/head-reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Accept-Language": locale },
        credentials: "include",
        body: JSON.stringify({ reviewer_comment: commentDrafts[id]?.trim() || t("rejected") }),
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

  async function endorseAriza(id: number) {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/v1/arizalar/${id}/endorse`, {
        method: "PATCH",
        headers: { "Accept-Language": locale },
        credentials: "include",
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

  async function deleteAriza(id: number) {
    if (!window.confirm(t("deleteConfirm"))) return;
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/v1/arizalar/${id}`, {
        method: "DELETE",
        headers: { "Accept-Language": locale },
        credentials: "include",
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

  return (
    <div className="space-y-5">
      <Link
        href="/dashboard/arizalar"
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-text-3 transition-colors hover:text-text-1"
      >
        <IconArrowLeft size={15} stroke={2} />
        {t("backToCategories")}
      </Link>

      <h1 className="text-xl font-semibold text-text-1">{categoryName}</h1>

      {error && (
        <p className="rounded-lg border border-danger-soft bg-danger-soft px-3 py-2.5 text-sm text-danger">{error}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        <StatChip icon={IconClipboardList} label={t("totalCount")} value={stats.total} tone="text-accent" />
        <StatChip icon={IconClock} label={t("pendingCount")} value={stats.pending} tone="text-warning" />
        <StatChip icon={IconCircleCheck} label={t("scoredCount")} value={stats.scored} tone="text-success" />
        <StatChip icon={IconCircleX} label={t("rejectedCount")} value={stats.rejected} tone="text-danger" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tabItem) => {
            const count = tabItem.key === "all" ? arizalar.length : counts[tabItem.key as ArizaStatus] ?? 0;
            const active = tab === tabItem.key;
            return (
              <button
                key={tabItem.key}
                type="button"
                onClick={() => setTab(tabItem.key)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  active ? "bg-accent text-white shadow-sm" : "bg-surface-alt text-text-2 hover:text-text-1"
                }`}
              >
                {t(tabItem.labelKey)}
                <span className={`rounded-full px-1.5 text-[10px] tabular-nums ${active ? "bg-white/20" : "bg-surface text-text-3"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="group flex w-56 items-center gap-2 rounded-full border border-border bg-bg px-3.5 py-2 transition-all focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft">
          <IconSearch size={15} stroke={1.75} className="shrink-0 text-text-3 transition-colors group-focus-within:text-accent" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full bg-transparent text-sm text-text-1 outline-none placeholder:text-text-3"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="w-40">
          <IconField icon={IconCalendar}>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="w-full bg-transparent text-sm text-text-1 outline-none"
            >
              <option value="">{t("allPeriods")}</option>
              {periodOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
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

      {indicators.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface px-6 py-16 text-center shadow-soft">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-alt text-text-3">
            <IconInbox size={22} stroke={1.5} />
          </div>
          <p className="text-sm font-medium text-text-1">{arizalar.length === 0 ? t("noArizalar") : t("noResults")}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {indicators.map((indicator) => (
            <div key={indicator.id} className="space-y-2.5">
              <div className="flex items-center gap-2 border-b border-border px-1 pb-2">
                <h3 className="text-sm font-semibold text-text-1">{indicator.name}</h3>
                <span className="rounded-full bg-surface-alt px-2 py-0.5 text-xs font-semibold text-text-2 tabular-nums">
                  {indicator.items.length}
                </span>
              </div>
              <div className="space-y-3">
                {indicator.items.map((ariza) => (
                  <ArizaCard
                    key={ariza.id}
                    ariza={ariza}
                    locale={locale}
                    busy={busyId === ariza.id}
                    scoreDraft={scoreDrafts[ariza.id] ?? ""}
                    commentDraft={commentDrafts[ariza.id] ?? ""}
                    onScoreDraftChange={(v) => setScoreDrafts((prev) => ({ ...prev, [ariza.id]: v }))}
                    onCommentDraftChange={(v) => setCommentDrafts((prev) => ({ ...prev, [ariza.id]: v }))}
                    onScore={() => scoreAriza(ariza.id)}
                    onReject={() => rejectAriza(ariza.id)}
                    onHeadApprove={() => headApproveAriza(ariza.id)}
                    onHeadReject={() => headRejectAriza(ariza.id)}
                    onEndorse={() => endorseAriza(ariza.id)}
                    onDelete={() => deleteAriza(ariza.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
