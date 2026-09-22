"use client";

import { IconBriefcase, IconCoins, IconPencil, IconPlus, IconTarget, IconTrash } from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import type { Position } from "@/lib/departments";
import ActionMenu from "@/components/ui/ActionMenu";
import FormSection from "@/components/ui/FormSection";

export default function PositionsManager({ departmentId, initialPositions }: { departmentId: number; initialPositions: Position[] }) {
  const locale = useLocale();
  const t = useTranslations("structure");
  const [positions, setPositions] = useState(initialPositions);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBonusFund, setEditBonusFund] = useState("");
  const [editMinimalScore, setEditMinimalScore] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newBonusFund, setNewBonusFund] = useState("");
  const [newMinimalScore, setNewMinimalScore] = useState("");

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

  async function addPosition(e: FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setError(null);
    const res = await fetch(`/api/v1/departments/${departmentId}/positions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept-Language": locale },
      credentials: "include",
      body: JSON.stringify({
        title: newTitle.trim(),
        bonus_fund: newBonusFund ? Number(newBonusFund) : null,
        minimal_score: newMinimalScore ? Number(newMinimalScore) : null,
      }),
    });
    if (!res.ok) {
      await handleError(res);
      return;
    }
    setNewTitle("");
    setNewBonusFund("");
    setNewMinimalScore("");
    await refresh();
  }

  function startEdit(position: Position) {
    setEditingId(position.id);
    setEditTitle(position.title);
    setEditBonusFund(position.bonus_fund != null ? String(position.bonus_fund) : "");
    setEditMinimalScore(position.minimal_score != null ? String(position.minimal_score) : "");
  }

  async function saveEdit(id: number) {
    if (!editTitle.trim()) return;
    setError(null);
    const res = await fetch(`/api/v1/positions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Accept-Language": locale },
      credentials: "include",
      body: JSON.stringify({
        title: editTitle.trim(),
        bonus_fund: editBonusFund ? Number(editBonusFund) : null,
        minimal_score: editMinimalScore ? Number(editMinimalScore) : null,
      }),
    });
    if (!res.ok) {
      await handleError(res);
      return;
    }
    setEditingId(null);
    await refresh();
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
        {error && (
          <p className="rounded-lg border border-danger-soft bg-danger-soft px-3 py-2.5 text-sm text-danger">{error}</p>
        )}

      <ul className="space-y-1.5">
        {positions.map((position) => (
          <li key={position.id} className="rounded-lg bg-bg px-3 py-2">
            {editingId === position.id ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="min-w-[8rem] flex-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-text-1 outline-none focus:border-accent"
                />
                <input
                  type="number"
                  min={0}
                  value={editBonusFund}
                  onChange={(e) => setEditBonusFund(e.target.value)}
                  placeholder={t("bonusFund")}
                  className="w-28 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-text-1 outline-none focus:border-accent"
                />
                <input
                  type="number"
                  min={0}
                  value={editMinimalScore}
                  onChange={(e) => setEditMinimalScore(e.target.value)}
                  placeholder={t("minimalScore")}
                  className="w-28 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-text-1 outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => saveEdit(position.id)}
                  className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-all hover:brightness-90"
                >
                  {t("save")}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="text-xs font-medium text-text-3 hover:text-text-1"
                >
                  {t("cancel")}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm text-text-2">
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
                </span>
                <ActionMenu
                  label={t("actions")}
                  items={[
                    { label: t("edit"), icon: IconPencil, onClick: () => startEdit(position) },
                    { label: t("delete"), icon: IconTrash, tone: "danger", onClick: () => deletePosition(position.id) },
                  ]}
                />
              </div>
            )}
          </li>
        ))}
        {positions.length === 0 && <li className="rounded-lg bg-bg px-3 py-2 text-xs text-text-3">{t("noPositions")}</li>}
      </ul>

      <form onSubmit={addPosition} className="flex flex-wrap gap-2 border-t border-border pt-3">
        <div className="group flex flex-1 items-center gap-1.5 rounded-lg border border-border bg-bg px-2.5 py-1.5 transition-all focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft">
          <IconBriefcase size={13} stroke={1.75} className="shrink-0 text-text-3 transition-colors group-focus-within:text-accent" />
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={t("newPositionPlaceholder")}
            className="w-full bg-transparent text-xs text-text-1 outline-none placeholder:text-text-3"
          />
        </div>
        <div className="group flex w-28 items-center gap-1.5 rounded-lg border border-border bg-bg px-2.5 py-1.5 transition-all focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft">
          <IconCoins size={13} stroke={1.75} className="shrink-0 text-text-3 transition-colors group-focus-within:text-accent" />
          <input
            type="number"
            min={0}
            value={newBonusFund}
            onChange={(e) => setNewBonusFund(e.target.value)}
            placeholder={t("bonusFund")}
            className="w-full bg-transparent text-xs text-text-1 outline-none placeholder:text-text-3"
          />
        </div>
        <div className="group flex w-28 items-center gap-1.5 rounded-lg border border-border bg-bg px-2.5 py-1.5 transition-all focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft">
          <IconTarget size={13} stroke={1.75} className="shrink-0 text-text-3 transition-colors group-focus-within:text-accent" />
          <input
            type="number"
            min={0}
            value={newMinimalScore}
            onChange={(e) => setNewMinimalScore(e.target.value)}
            placeholder={t("minimalScore")}
            className="w-full bg-transparent text-xs text-text-1 outline-none placeholder:text-text-3"
          />
        </div>
        <button
          type="submit"
          disabled={!newTitle.trim()}
          className="flex items-center gap-1 rounded-lg bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          <IconPlus size={13} stroke={2} />
          {t("add")}
        </button>
        </form>
        </div>
      </FormSection>
    </div>
  );
}
