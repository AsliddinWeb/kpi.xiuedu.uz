"use client";

import { IconBriefcase, IconCoins, IconPencil, IconPlus, IconSchool, IconTarget, IconTrash } from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import type { Position } from "@/lib/departments";
import ActionMenu from "@/components/ui/ActionMenu";
import FormSection from "@/components/ui/FormSection";
import IconField from "@/components/ui/IconField";
import Modal from "@/components/ui/Modal";

type Draft = { title: string; bonusFund: string; minimalScore: string };
const EMPTY_DRAFT: Draft = { title: "", bonusFund: "", minimalScore: "" };

export default function PositionsManager({ departmentId, initialPositions }: { departmentId: number; initialPositions: Position[] }) {
  const locale = useLocale();
  const t = useTranslations("structure");
  const [positions, setPositions] = useState(initialPositions);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const res = await fetch(`/api/v1/departments/${departmentId}`, {
      headers: { "Accept-Language": locale },
      credentials: "include",
      cache: "no-store",
    });
    if (res.ok) setPositions((await res.json()).positions);
  }

  async function handleError(res: Response) {
    const body = await res.json().catch(() => null);
    setError(body?.detail ?? t("genericError"));
  }

  function openAdd() {
    setDraft(EMPTY_DRAFT);
    setError(null);
    setModal("add");
  }

  function openEdit(position: Position) {
    setEditingId(position.id);
    setDraft({
      title: position.title,
      bonusFund: position.bonus_fund != null ? String(position.bonus_fund) : "",
      minimalScore: position.minimal_score != null ? String(position.minimal_score) : "",
    });
    setError(null);
    setModal("edit");
  }

  function closeModal() {
    setModal(null);
    setEditingId(null);
  }

  async function submitAdd(e: FormEvent) {
    e.preventDefault();
    if (!draft.title.trim()) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/departments/${departmentId}/positions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept-Language": locale },
        credentials: "include",
        body: JSON.stringify({
          title: draft.title.trim(),
          bonus_fund: draft.bonusFund ? Number(draft.bonusFund) : null,
          minimal_score: draft.minimalScore ? Number(draft.minimalScore) : null,
        }),
      });
      if (!res.ok) {
        await handleError(res);
        return;
      }
      closeModal();
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function submitEdit(e: FormEvent) {
    e.preventDefault();
    if (!draft.title.trim() || editingId == null) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/positions/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Accept-Language": locale },
        credentials: "include",
        body: JSON.stringify({
          title: draft.title.trim(),
          bonus_fund: draft.bonusFund ? Number(draft.bonusFund) : null,
          minimal_score: draft.minimalScore ? Number(draft.minimalScore) : null,
        }),
      });
      if (!res.ok) {
        await handleError(res);
        return;
      }
      closeModal();
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function deletePosition(id: number) {
    if (!window.confirm(t("deleteConfirmPosition"))) return;
    setError(null);
    const res = await fetch(`/api/v1/positions/${id}`, {
      method: "DELETE",
      headers: { "Accept-Language": locale },
      credentials: "include",
    });
    if (!res.ok) {
      await handleError(res);
      return;
    }
    await refresh();
  }

  return (
    <div className="mt-5 max-w-xl">
      <FormSection icon={IconBriefcase} title={t("positionsHeading")}>
        <div className="space-y-3">
          {error && !modal && (
            <p className="rounded-lg border border-danger-soft bg-danger-soft px-3 py-2.5 text-sm text-danger">{error}</p>
          )}

          <ul className="space-y-1.5">
            {positions.map((position) => {
              const inherited = position.inherited_from_department_id != null;
              return (
                <li key={position.id} className="flex items-center justify-between gap-2 rounded-lg bg-bg px-3 py-2">
                  <span className="flex flex-wrap items-center gap-2 text-sm text-text-2">
                    <IconBriefcase size={14} stroke={1.75} className="shrink-0 text-text-3" />
                    {position.title}
                    {position.bonus_fund != null && (
                      <span className="flex items-center gap-1 text-xs text-text-3">
                        <IconCoins size={12} stroke={1.75} />
                        {position.bonus_fund.toLocaleString()}
                      </span>
                    )}
                    {position.minimal_score != null && (
                      <span className="flex items-center gap-1 text-xs text-text-3">
                        <IconTarget size={12} stroke={1.75} />
                        {position.minimal_score}
                      </span>
                    )}
                    {inherited && (
                      <span className="flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
                        <IconSchool size={11} stroke={1.75} />
                        {t("inherited")}
                      </span>
                    )}
                  </span>
                  {!inherited && (
                    <ActionMenu
                      label={t("actions")}
                      items={[
                        { label: t("edit"), icon: IconPencil, onClick: () => openEdit(position) },
                        { label: t("delete"), icon: IconTrash, tone: "danger", onClick: () => deletePosition(position.id) },
                      ]}
                    />
                  )}
                </li>
              );
            })}
            {positions.length === 0 && <li className="rounded-lg bg-bg px-3 py-2 text-xs text-text-3">{t("noPositions")}</li>}
          </ul>

          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs font-semibold text-text-2 transition-colors hover:border-accent hover:text-accent"
          >
            <IconPlus size={14} stroke={2} />
            {t("addPosition")}
          </button>
        </div>
      </FormSection>

      {modal && (
        <Modal title={modal === "add" ? t("addPosition") : t("editPosition")} onClose={closeModal}>
          <form onSubmit={modal === "add" ? submitAdd : submitEdit} className="space-y-4">
            {error && (
              <p className="rounded-lg border border-danger-soft bg-danger-soft px-3 py-2.5 text-sm text-danger">{error}</p>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-2">{t("positionTitleLabel")}</label>
              <IconField icon={IconBriefcase}>
                <input
                  required
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  placeholder={t("newPositionPlaceholder")}
                  className="w-full bg-transparent text-sm text-text-1 outline-none placeholder:text-text-3"
                />
              </IconField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-2">{t("bonusFund")}</label>
                <IconField icon={IconCoins}>
                  <input
                    type="number"
                    min={0}
                    value={draft.bonusFund}
                    onChange={(e) => setDraft((d) => ({ ...d, bonusFund: e.target.value }))}
                    className="w-full bg-transparent text-sm text-text-1 outline-none"
                  />
                </IconField>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-2">{t("minimalScore")}</label>
                <IconField icon={IconTarget}>
                  <input
                    type="number"
                    min={0}
                    value={draft.minimalScore}
                    onChange={(e) => setDraft((d) => ({ ...d, minimalScore: e.target.value }))}
                    className="w-full bg-transparent text-sm text-text-1 outline-none"
                  />
                </IconField>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg px-4 py-2 text-sm font-medium text-text-2 transition-colors hover:bg-surface-alt hover:text-text-1"
              >
                {t("cancel")}
              </button>
              <button
                type="submit"
                disabled={!draft.title.trim() || saving}
                className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-90 disabled:opacity-50"
              >
                {saving ? t("saving") : t("save")}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
