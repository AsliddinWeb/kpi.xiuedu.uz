"use client";

import {
  IconCircleCheck,
  IconCircleX,
  IconClipboardList,
  IconClock,
  IconFileText,
  IconHash,
  IconMessage2,
  IconShieldCheck,
  IconTrash,
  IconUserCheck,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import ActionMenu from "@/components/ui/ActionMenu";
import TimeAgo from "@/components/ui/TimeAgo";
import type { Ariza, ArizaStatus } from "@/lib/arizalar";

const STATUS_META: Record<ArizaStatus, { icon: typeof IconClock; tone: string }> = {
  submitted: { icon: IconClock, tone: "bg-warning-soft text-warning" },
  kafedra_endorsed: { icon: IconShieldCheck, tone: "bg-accent-soft text-accent" },
  scored: { icon: IconCircleCheck, tone: "bg-success-soft text-success" },
  pending_head_approval: { icon: IconUserCheck, tone: "bg-warning-soft text-warning" },
  approved: { icon: IconCircleCheck, tone: "bg-success-soft text-success" },
  rejected: { icon: IconCircleX, tone: "bg-danger-soft text-danger" },
};

export default function ArizaCard({
  ariza,
  locale,
  busy,
  scoreDraft,
  commentDraft,
  onScoreDraftChange,
  onCommentDraftChange,
  onScore,
  onReject,
  onHeadApprove,
  onHeadReject,
  onEndorse,
  onDelete,
}: {
  ariza: Ariza;
  locale: string;
  busy: boolean;
  scoreDraft: string;
  commentDraft: string;
  onScoreDraftChange: (value: string) => void;
  onCommentDraftChange: (value: string) => void;
  onScore: () => void;
  onReject: () => void;
  onHeadApprove: () => void;
  onHeadReject: () => void;
  onEndorse: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("arizalar");
  const meta = STATUS_META[ariza.status];
  const StatusIcon = meta.icon;
  const scoreValue = Number(scoreDraft) || 0;
  const previewPercent = Math.min((scoreValue / ariza.max_score) * 100, 100);
  const canReview = ariza.status === "submitted" || ariza.status === "kafedra_endorsed";

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-soft transition-all hover:shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-xs font-bold text-accent">
            {ariza.user_full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-text-1">{ariza.user_full_name}</p>
            <p className="text-xs text-text-3">
              {ariza.period} · <TimeAgo iso={ariza.submitted_at} locale={locale} />
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.tone}`}>
            <StatusIcon size={13} stroke={2} />
            {t(`statusValues.${ariza.status}`)}
          </span>
          <ActionMenu
            label={t("actions")}
            items={[{ label: t("delete"), icon: IconTrash, tone: "danger", disabled: busy, onClick: onDelete }]}
          />
        </div>
      </div>

      {ariza.files.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {ariza.files.map((file) => (
            <a
              key={file.id}
              href={`/api/v1/arizalar/${ariza.id}/files/${file.id}/download`}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-xs font-medium text-text-2 transition-colors hover:border-accent hover:text-accent"
            >
              <IconFileText size={13} stroke={1.75} />
              <span className="max-w-[10rem] truncate">{file.original_filename}</span>
            </a>
          ))}
        </div>
      )}

      {ariza.employee_comment && (
        <p className="mt-2.5 rounded-lg bg-surface-alt px-3 py-2 text-xs text-text-2">
          <span className="font-medium text-text-1">{t("employeeComment")}:</span> {ariza.employee_comment}
        </p>
      )}

      {ariza.co_authors.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-text-3">{t("coAuthors")}:</span>
          {ariza.co_authors.map((c, i) => (
            <span key={i} className="flex items-center gap-1 rounded-full bg-surface-alt px-2 py-0.5 text-xs text-text-2">
              {c.co_author_name ?? `#${c.co_author_user_id}`} ({c.share_percent}%)
            </span>
          ))}
        </div>
      )}

      {(ariza.status === "scored" || ariza.status === "pending_head_approval" || ariza.status === "approved") && (
        <div className="mt-3.5 border-t border-border pt-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-3">{t("awardedScore")}</span>
            <span className="font-semibold text-text-1 tabular-nums">
              {ariza.awarded_score} / {ariza.max_score}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-alt">
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${
                ariza.status === "pending_head_approval" ? "bg-warning" : "bg-success"
              }`}
              style={{ width: `${((ariza.awarded_score ?? 0) / ariza.max_score) * 100}%` }}
            />
          </div>
          {ariza.status === "pending_head_approval" && (
            <p className="mt-1.5 text-[0.7rem] text-text-3">{t("pendingHeadApprovalHint")}</p>
          )}
        </div>
      )}

      {ariza.status === "pending_head_approval" && (
        <div className="mt-3.5 rounded-lg border border-warning-soft bg-warning-soft/40 p-3">
          <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-warning">
            <IconUserCheck size={13} stroke={1.75} />
            {t("headApprovalPanel")}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onHeadApprove}
              className="rounded-lg bg-success px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-90 active:scale-[0.98] disabled:opacity-50"
            >
              {t("headApprove")}
            </button>
            <div className="group flex min-w-[10rem] flex-1 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-2 transition-all focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft">
              <IconMessage2 size={14} stroke={1.75} className="shrink-0 text-text-3 transition-colors group-focus-within:text-accent" />
              <input
                placeholder={t("comment")}
                value={commentDraft}
                onChange={(e) => onCommentDraftChange(e.target.value)}
                className="w-full bg-transparent text-sm text-text-1 outline-none placeholder:text-text-3"
              />
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={onHeadReject}
              className="rounded-lg bg-danger-soft px-3.5 py-2 text-xs font-semibold text-danger transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {t("reject")}
            </button>
          </div>
        </div>
      )}

      {canReview && (
        <div className="mt-3.5 rounded-lg border border-border bg-bg p-3">
          <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-text-2">
            <IconClipboardList size={13} stroke={1.75} />
            {t("reviewPanel")}
          </p>
          <div className="flex flex-wrap items-start gap-2">
            {ariza.requires_kafedra_endorsement && ariza.status === "submitted" && (
              <button
                type="button"
                disabled={busy}
                onClick={onEndorse}
                className="flex items-center gap-1.5 rounded-lg bg-accent-soft px-3 py-2 text-xs font-semibold text-accent transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                <IconShieldCheck size={14} stroke={1.75} />
                {t("endorse")}
              </button>
            )}
            <div className="flex w-32 flex-col gap-1">
              <div className="group flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-2 transition-all focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft">
                <IconHash size={14} stroke={1.75} className="shrink-0 text-text-3 transition-colors group-focus-within:text-accent" />
                <input
                  type="number"
                  min={0}
                  max={ariza.max_score}
                  placeholder={`${t("score")} / ${ariza.max_score}`}
                  value={scoreDraft}
                  onChange={(e) => onScoreDraftChange(e.target.value)}
                  className="w-full bg-transparent text-sm text-text-1 outline-none placeholder:text-text-3"
                />
              </div>
              {scoreDraft && (
                <div className="h-1 w-full overflow-hidden rounded-full bg-surface-alt">
                  <div className="h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${previewPercent}%` }} />
                </div>
              )}
            </div>
            <div className="group flex min-w-[10rem] flex-1 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-2 transition-all focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft">
              <IconMessage2 size={14} stroke={1.75} className="shrink-0 text-text-3 transition-colors group-focus-within:text-accent" />
              <input
                placeholder={t("comment")}
                value={commentDraft}
                onChange={(e) => onCommentDraftChange(e.target.value)}
                className="w-full bg-transparent text-sm text-text-1 outline-none placeholder:text-text-3"
              />
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={onScore}
              className="rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-90 active:scale-[0.98] disabled:opacity-50"
            >
              {t("score")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onReject}
              className="rounded-lg bg-danger-soft px-3.5 py-2 text-xs font-semibold text-danger transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {t("reject")}
            </button>
          </div>
        </div>
      )}

      {ariza.reviewer_comment && (
        <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-surface-alt px-3 py-2 text-xs text-text-2">
          <IconShieldCheck size={13} stroke={1.75} className="mt-0.5 shrink-0 text-text-3" />
          <span>
            <span className="font-medium text-text-1">{t("reviewerComment")}:</span> {ariza.reviewer_comment}
          </span>
        </p>
      )}
    </div>
  );
}
