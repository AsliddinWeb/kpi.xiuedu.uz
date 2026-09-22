"use client";

import {
  IconArrowLeft,
  IconGift,
  IconPaperclip,
  IconShieldCheck,
  IconStack3,
  IconUserCheck,
  IconUsersGroup,
} from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import type { CategoryHeadApprover } from "@/lib/categoryHeadApprovers";
import type { CategoryReviewer } from "@/lib/categoryReviewers";
import type { Employee } from "@/lib/employees";
import type { KpiCategory, KpiTemplate } from "@/lib/kpiTemplates";
import FormSection from "@/components/ui/FormSection";

export default function CategoryAssignmentView({
  template,
  category,
  employees,
  initialReviewers,
  initialHeadApprovers,
}: {
  template: KpiTemplate;
  category: KpiCategory;
  employees: Employee[];
  initialReviewers: CategoryReviewer[];
  initialHeadApprovers: CategoryHeadApprover[];
}) {
  const locale = useLocale();
  const t = useTranslations("templates");

  const [reviewers, setReviewers] = useState(initialReviewers);
  const [reviewerDraft, setReviewerDraft] = useState("");
  const [headApprovers, setHeadApprovers] = useState(initialHeadApprovers);
  const [headApproverDraft, setHeadApproverDraft] = useState("");
  const [headApproverIndicatorDraft, setHeadApproverIndicatorDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refreshReviewers() {
    const res = await fetch("/api/v1/category-reviewers", {
      headers: { "Accept-Language": locale },
      credentials: "include",
      cache: "no-store",
    });
    if (res.ok) setReviewers((await res.json()).filter((r: CategoryReviewer) => r.kpi_category_id === category.id));
  }

  async function addReviewer() {
    if (!reviewerDraft) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/v1/category-reviewers", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept-Language": locale },
        credentials: "include",
        body: JSON.stringify({ kpi_category_id: category.id, user_id: Number(reviewerDraft) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.detail ?? t("genericError"));
        return;
      }
      setReviewerDraft("");
      await refreshReviewers();
    } finally {
      setBusy(false);
    }
  }

  async function removeReviewer(reviewerId: number) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/category-reviewers/${reviewerId}`, {
        method: "DELETE",
        headers: { "Accept-Language": locale },
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.detail ?? t("genericError"));
        return;
      }
      await refreshReviewers();
    } finally {
      setBusy(false);
    }
  }

  async function refreshHeadApprovers() {
    const res = await fetch("/api/v1/category-head-approvers", {
      headers: { "Accept-Language": locale },
      credentials: "include",
      cache: "no-store",
    });
    if (res.ok)
      setHeadApprovers((await res.json()).filter((a: CategoryHeadApprover) => a.kpi_category_id === category.id));
  }

  async function addHeadApprover() {
    if (!headApproverDraft) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/v1/category-head-approvers", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept-Language": locale },
        credentials: "include",
        body: JSON.stringify({
          kpi_category_id: category.id,
          kpi_indicator_id: headApproverIndicatorDraft ? Number(headApproverIndicatorDraft) : null,
          user_id: Number(headApproverDraft),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.detail ?? t("genericError"));
        return;
      }
      setHeadApproverDraft("");
      setHeadApproverIndicatorDraft("");
      await refreshHeadApprovers();
    } finally {
      setBusy(false);
    }
  }

  async function removeHeadApprover(approverId: number) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/category-head-approvers/${approverId}`, {
        method: "DELETE",
        headers: { "Accept-Language": locale },
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.detail ?? t("genericError"));
        return;
      }
      await refreshHeadApprovers();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href={`/dashboard/templates/${template.id}`}
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-text-3 transition-colors hover:text-text-1"
      >
        <IconArrowLeft size={15} stroke={2} />
        {template.name}
      </Link>

      {error && (
        <p className="rounded-lg border border-danger-soft bg-danger-soft px-3 py-2.5 text-sm text-danger">{error}</p>
      )}

      <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-text-1">{category.name}</h1>
          <span className="rounded-full bg-surface-alt px-3 py-1 text-sm font-semibold text-text-2 tabular-nums">
            {t("maxScore")}: {category.max_score}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {category.is_bonus_category && (
            <span className="flex items-center gap-1.5 rounded-full bg-warning-soft px-3 py-1.5 text-xs font-semibold text-warning">
              <IconGift size={14} stroke={1.75} />
              {t("bonusCategory")}
            </span>
          )}
          {category.requires_kafedra_endorsement && (
            <span className="flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent">
              <IconShieldCheck size={14} stroke={1.75} />
              {t("requiresEndorsement")}
            </span>
          )}
          {category.requires_head_approval && (
            <span className="flex items-center gap-1.5 rounded-full bg-warning-soft px-3 py-1.5 text-xs font-semibold text-warning">
              <IconUserCheck size={14} stroke={1.75} />
              {t("requiresHeadApproval")}
            </span>
          )}
        </div>
      </div>

      <FormSection icon={IconStack3} title={t("indicatorsCount")}>
        <div className="space-y-2.5">
          {category.indicators.map((ind) => (
            <div key={ind.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg px-4 py-3">
              <span className="text-sm text-text-1">{ind.name}</span>
              <div className="flex shrink-0 items-center gap-3 text-xs text-text-3">
                {ind.allow_coauthors && (
                  <span className="flex items-center gap-1">
                    <IconUsersGroup size={14} stroke={1.75} />
                    {t("allowCoauthors")}
                  </span>
                )}
                {ind.requires_file && (
                  <span className="flex items-center gap-1">
                    <IconPaperclip size={14} stroke={1.75} />
                    {t("requiresFile")}
                  </span>
                )}
                <span className="rounded-full bg-surface-alt px-2.5 py-1 font-semibold text-text-2 tabular-nums">{ind.max_score}</span>
              </div>
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection icon={IconUsersGroup} title={t("categoryReviewers")}>
        <div className="space-y-2.5">
          {reviewers.length === 0 ? (
            <p className="text-sm text-text-3">{t("noReviewersYet")}</p>
          ) : (
            reviewers.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                    {r.user_full_name.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-text-1">{r.user_full_name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeReviewer(r.id)}
                  disabled={busy}
                  className="text-xs font-semibold text-danger transition-opacity hover:opacity-75 disabled:opacity-40"
                >
                  {t("removeReviewer")}
                </button>
              </div>
            ))
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3.5">
            <select
              value={reviewerDraft}
              onChange={(e) => setReviewerDraft(e.target.value)}
              className="min-w-[14rem] flex-1 rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-1 outline-none focus:border-accent"
            >
              <option value="">{t("selectReviewer")}</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addReviewer}
              disabled={!reviewerDraft || busy}
              className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-90 active:scale-[0.98] disabled:opacity-50"
            >
              {t("addReviewer")}
            </button>
          </div>
        </div>
      </FormSection>

      {category.requires_head_approval && (
        <FormSection icon={IconUserCheck} title={t("headApprovers")}>
          <div className="space-y-2.5">
            {headApprovers.length === 0 ? (
              <p className="text-sm text-text-3">{t("noHeadApproversYet")}</p>
            ) : (
              headApprovers.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-warning text-xs font-bold text-white">
                      {a.user_full_name.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-text-1">{a.user_full_name}</p>
                      <p className="text-xs text-text-3">{a.indicator_name ?? t("wholeCategory")}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeHeadApprover(a.id)}
                    disabled={busy}
                    className="text-xs font-semibold text-danger transition-opacity hover:opacity-75 disabled:opacity-40"
                  >
                    {t("removeHeadApprover")}
                  </button>
                </div>
              ))
            )}

            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3.5">
              <select
                value={headApproverIndicatorDraft}
                onChange={(e) => setHeadApproverIndicatorDraft(e.target.value)}
                className="min-w-[12rem] rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-1 outline-none focus:border-accent"
              >
                <option value="">{t("wholeCategory")}</option>
                {category.indicators.map((ind) => (
                  <option key={ind.id} value={ind.id}>
                    {ind.name}
                  </option>
                ))}
              </select>
              <select
                value={headApproverDraft}
                onChange={(e) => setHeadApproverDraft(e.target.value)}
                className="min-w-[12rem] flex-1 rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-1 outline-none focus:border-accent"
              >
                <option value="">{t("selectHeadApprover")}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addHeadApprover}
                disabled={!headApproverDraft || busy}
                className="rounded-lg bg-warning px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-90 active:scale-[0.98] disabled:opacity-50"
              >
                {t("addHeadApprover")}
              </button>
            </div>
          </div>
        </FormSection>
      )}
    </div>
  );
}
