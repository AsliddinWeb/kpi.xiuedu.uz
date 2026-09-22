"use client";

import {
  IconAlertTriangle,
  IconCalendar,
  IconCertificate,
  IconCircleCheck,
  IconFolderOpen,
  IconGift,
  IconHash,
  IconInfoCircle,
  IconLayoutGrid,
  IconListCheck,
  IconPaperclip,
  IconPlus,
  IconShieldCheck,
  IconStack3,
  IconTrash,
  IconUserCheck,
  IconUsersGroup,
} from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { KpiTemplate } from "@/lib/kpiTemplates";

type RankOverrideEntry = { id: number; max_score: string } | null;
type RankOverridePair = { titled: RankOverrideEntry; untitled: RankOverrideEntry };

type IndicatorDraft = {
  id: number | null;
  name: string;
  max_score: string;
  allow_coauthors: boolean;
  requires_file: boolean;
};
type CategoryDraft = {
  id: number | null;
  name: string;
  max_score: string;
  is_bonus_category: boolean;
  requires_kafedra_endorsement: boolean;
  requires_head_approval: boolean;
  indicators: IndicatorDraft[];
};

const PERIODS = ["monthly", "quarterly", "yearly"] as const;
const ACCENT_BAR_COLORS = ["bg-accent", "bg-success", "bg-warning", "bg-danger", "bg-[#8b5cf6]", "bg-[#0ea5e9]"];

function emptyIndicator(): IndicatorDraft {
  return { id: null, name: "", max_score: "", allow_coauthors: false, requires_file: true };
}

function emptyCategory(): CategoryDraft {
  return {
    id: null,
    name: "",
    max_score: "",
    is_bonus_category: false,
    requires_kafedra_endorsement: false,
    requires_head_approval: false,
    indicators: [emptyIndicator()],
  };
}

function draftsFromTemplate(template: KpiTemplate): CategoryDraft[] {
  return template.categories.map((c) => ({
    id: c.id,
    name: c.name,
    max_score: String(c.max_score),
    is_bonus_category: c.is_bonus_category,
    requires_kafedra_endorsement: c.requires_kafedra_endorsement,
    requires_head_approval: c.requires_head_approval,
    indicators: c.indicators.map((i) => ({
      id: i.id,
      name: i.name,
      max_score: String(i.max_score),
      allow_coauthors: i.allow_coauthors,
      requires_file: i.requires_file,
    })),
  }));
}

function IconToggle({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof IconGift;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
        active ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface text-text-3 hover:text-text-1"
      }`}
    >
      <Icon size={14} stroke={1.75} />
      {label}
    </button>
  );
}

function SectionCard({ icon: Icon, title, children }: { icon: typeof IconInfoCircle; title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-soft">
      <div className="mb-5 flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <Icon size={16} stroke={1.75} />
        </div>
        <h2 className="text-sm font-semibold text-text-1">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function MiniField({
  icon: Icon,
  children,
  tone = "bg",
}: {
  icon: typeof IconHash;
  children: ReactNode;
  tone?: "bg" | "surface";
}) {
  return (
    <div
      className={`group flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 transition-all focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft ${
        tone === "surface" ? "bg-surface" : "bg-bg"
      }`}
    >
      <Icon size={13} stroke={1.75} className="shrink-0 text-text-3 transition-colors group-focus-within:text-accent" />
      {children}
    </div>
  );
}

function RankOverrideFields({
  pair,
  onSave,
  titledLabel,
  untitledLabel,
}: {
  pair: RankOverridePair | undefined;
  onSave: (hasTitle: boolean, existing: RankOverrideEntry, value: string) => void;
  titledLabel: string;
  untitledLabel: string;
}) {
  const [titledValue, setTitledValue] = useState(pair?.titled?.max_score ?? "");
  const [untitledValue, setUntitledValue] = useState(pair?.untitled?.max_score ?? "");

  useEffect(() => {
    setTitledValue(pair?.titled?.max_score ?? "");
    setUntitledValue(pair?.untitled?.max_score ?? "");
  }, [pair?.titled?.max_score, pair?.untitled?.max_score]);

  return (
    <>
      <div className="w-24">
        <MiniField icon={IconCertificate} tone="surface">
          <input
            type="number"
            min={0}
            title={titledLabel}
            placeholder={titledLabel}
            value={titledValue}
            onChange={(e) => setTitledValue(e.target.value)}
            onBlur={(e) => onSave(true, pair?.titled ?? null, e.target.value)}
            className="w-full bg-transparent text-sm text-text-1 outline-none placeholder:text-text-3"
          />
        </MiniField>
      </div>
      <div className="w-24">
        <MiniField icon={IconCertificate} tone="surface">
          <input
            type="number"
            min={0}
            title={untitledLabel}
            placeholder={untitledLabel}
            value={untitledValue}
            onChange={(e) => setUntitledValue(e.target.value)}
            onBlur={(e) => onSave(false, pair?.untitled ?? null, e.target.value)}
            className="w-full bg-transparent text-sm text-text-1 outline-none placeholder:text-text-3"
          />
        </MiniField>
      </div>
    </>
  );
}

export default function TemplateForm({ mode, template }: { mode: "create" | "edit"; template: KpiTemplate | null }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("templates");
  const periodT = useTranslations("setup.period");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState(template?.name ?? "");
  const [annexCode, setAnnexCode] = useState(template?.annex_code ?? "");
  const [academicYear, setAcademicYear] = useState(template?.academic_year ?? "");
  const [periodType, setPeriodType] = useState<(typeof PERIODS)[number]>(template?.period_type ?? "monthly");
  const [isActive, setIsActive] = useState(template?.is_active ?? true);
  const [categories, setCategories] = useState<CategoryDraft[]>(
    template ? draftsFromTemplate(template) : [emptyCategory()],
  );

  const [indicatorOverrides, setIndicatorOverrides] = useState<Record<number, RankOverridePair>>({});
  const [categoryOverrides, setCategoryOverrides] = useState<Record<number, RankOverridePair>>({});

  useEffect(() => {
    if (mode !== "edit" || !template) return;
    (async () => {
      const [indicatorRes, categoryRes] = await Promise.all([
        fetch(`/api/v1/rank-overrides/indicators?kpi_template_id=${template.id}`, {
          headers: { "Accept-Language": locale },
          credentials: "include",
          cache: "no-store",
        }),
        fetch(`/api/v1/rank-overrides/categories?kpi_template_id=${template.id}`, {
          headers: { "Accept-Language": locale },
          credentials: "include",
          cache: "no-store",
        }),
      ]);
      if (indicatorRes.ok) {
        const rows: { id: number; kpi_indicator_id: number; has_title: boolean; max_score: number }[] =
          await indicatorRes.json();
        const next: Record<number, RankOverridePair> = {};
        for (const row of rows) {
          const entry = next[row.kpi_indicator_id] ?? { titled: null, untitled: null };
          const value = { id: row.id, max_score: String(row.max_score) };
          next[row.kpi_indicator_id] = row.has_title ? { ...entry, titled: value } : { ...entry, untitled: value };
        }
        setIndicatorOverrides(next);
      }
      if (categoryRes.ok) {
        const rows: { id: number; kpi_category_id: number; has_title: boolean; max_score: number }[] =
          await categoryRes.json();
        const next: Record<number, RankOverridePair> = {};
        for (const row of rows) {
          const entry = next[row.kpi_category_id] ?? { titled: null, untitled: null };
          const value = { id: row.id, max_score: String(row.max_score) };
          next[row.kpi_category_id] = row.has_title ? { ...entry, titled: value } : { ...entry, untitled: value };
        }
        setCategoryOverrides(next);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, template?.id]);

  async function saveRankOverride(
    kind: "indicators" | "categories",
    idField: "kpi_indicator_id" | "kpi_category_id",
    targetId: number,
    hasTitle: boolean,
    existing: RankOverrideEntry,
    rawValue: string,
  ) {
    const setState = kind === "indicators" ? setIndicatorOverrides : setCategoryOverrides;
    const trimmed = rawValue.trim();
    if (!trimmed) {
      if (existing) {
        await fetch(`/api/v1/rank-overrides/${kind}/${existing.id}`, {
          method: "DELETE",
          headers: { "Accept-Language": locale },
          credentials: "include",
        });
        setState((prev) => ({
          ...prev,
          [targetId]: { ...prev[targetId], [hasTitle ? "titled" : "untitled"]: null } as RankOverridePair,
        }));
      }
      return;
    }
    const max_score = Number(trimmed);
    if (Number.isNaN(max_score)) return;

    const res = existing
      ? await fetch(`/api/v1/rank-overrides/${kind}/${existing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "Accept-Language": locale },
          credentials: "include",
          body: JSON.stringify({ max_score }),
        })
      : await fetch(`/api/v1/rank-overrides/${kind}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept-Language": locale },
          credentials: "include",
          body: JSON.stringify({ [idField]: targetId, has_title: hasTitle, max_score }),
        });
    if (!res.ok) return;
    const body = await res.json();
    setState((prev) => ({
      ...prev,
      [targetId]: {
        ...prev[targetId],
        [hasTitle ? "titled" : "untitled"]: { id: body.id, max_score: String(body.max_score) },
      } as RankOverridePair,
    }));
  }

  const baseTotal = categories
    .filter((c) => !c.is_bonus_category)
    .reduce((sum, c) => sum + (Number(c.max_score) || 0), 0);
  const bonusTotal = categories
    .filter((c) => c.is_bonus_category)
    .reduce((sum, c) => sum + (Number(c.max_score) || 0), 0);
  const isValidTotal = baseTotal === 100;
  const categoryMismatches = categories.filter((c) => {
    const indicatorsTotal = c.indicators.reduce((sum, i) => sum + (Number(i.max_score) || 0), 0);
    return indicatorsTotal !== (Number(c.max_score) || 0);
  });
  const isValid = isValidTotal && categoryMismatches.length === 0;

  function updateCategory(index: number, patch: Partial<CategoryDraft>) {
    setCategories((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function updateIndicator(categoryIndex: number, indicatorIndex: number, patch: Partial<IndicatorDraft>) {
    setCategories((prev) =>
      prev.map((c, i) =>
        i === categoryIndex
          ? { ...c, indicators: c.indicators.map((ind, j) => (j === indicatorIndex ? { ...ind, ...patch } : ind)) }
          : c,
      ),
    );
  }

  function addCategory() {
    setCategories((prev) => [...prev, emptyCategory()]);
  }

  function removeCategory(index: number) {
    setCategories((prev) => prev.filter((_, i) => i !== index));
  }

  function addIndicator(categoryIndex: number) {
    setCategories((prev) =>
      prev.map((c, i) => (i === categoryIndex ? { ...c, indicators: [...c.indicators, emptyIndicator()] } : c)),
    );
  }

  function removeIndicator(categoryIndex: number, indicatorIndex: number) {
    setCategories((prev) =>
      prev.map((c, i) =>
        i === categoryIndex ? { ...c, indicators: c.indicators.filter((_, j) => j !== indicatorIndex) } : c,
      ),
    );
  }

  const categoriesPayload = categories.map((c) => ({
    name: c.name.trim(),
    max_score: Number(c.max_score) || 0,
    is_bonus_category: c.is_bonus_category,
    requires_kafedra_endorsement: c.requires_kafedra_endorsement,
    requires_head_approval: c.requires_head_approval,
    indicators: c.indicators
      .filter((ind) => ind.name.trim())
      .map((ind) => ({
        name: ind.name.trim(),
        max_score: Number(ind.max_score) || 0,
        allow_coauthors: ind.allow_coauthors,
        requires_file: ind.requires_file,
      })),
  }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name || !annexCode || !academicYear || !isValid) return;
    setError(null);
    setSubmitting(true);
    try {
      const res =
        mode === "create"
          ? await fetch("/api/v1/kpi-templates", {
              method: "POST",
              headers: { "Content-Type": "application/json", "Accept-Language": locale },
              credentials: "include",
              body: JSON.stringify({
                name,
                annex_code: annexCode,
                academic_year: academicYear,
                period_type: periodType,
                categories: categoriesPayload,
              }),
            })
          : await fetch(`/api/v1/kpi-templates/${template!.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json", "Accept-Language": locale },
              credentials: "include",
              body: JSON.stringify({
                name,
                is_active: isActive,
                categories: categoriesPayload,
              }),
            });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.detail ?? t("genericError"));
        return;
      }
      router.push("/dashboard/templates");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p className="flex items-center gap-2 rounded-lg border border-danger-soft bg-danger-soft px-3 py-2.5 text-sm text-danger">
          <IconAlertTriangle size={16} stroke={1.75} className="shrink-0" />
          {error}
        </p>
      )}

      <SectionCard icon={IconInfoCircle} title={t("basicInfo")}>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="group flex items-center gap-2 rounded-xl border border-border bg-bg px-3.5 py-2.5 transition-all focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft sm:col-span-2">
            <IconStack3 size={16} stroke={1.75} className="shrink-0 text-text-3 transition-colors group-focus-within:text-accent" />
            <input
              required
              placeholder={t("templateName")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent text-sm text-text-1 outline-none placeholder:text-text-3"
            />
          </div>
          <div className="group flex items-center gap-2 rounded-xl border border-border bg-bg px-3.5 py-2.5 transition-all focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft">
            <IconHash size={16} stroke={1.75} className="shrink-0 text-text-3 transition-colors group-focus-within:text-accent" />
            <input
              required
              disabled={mode === "edit"}
              placeholder={t("annexCode")}
              value={annexCode}
              onChange={(e) => setAnnexCode(e.target.value)}
              className="w-full bg-transparent text-sm text-text-1 outline-none placeholder:text-text-3 disabled:text-text-3"
            />
          </div>
          <div className="group flex items-center gap-2 rounded-xl border border-border bg-bg px-3.5 py-2.5 transition-all focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft">
            <IconCalendar size={16} stroke={1.75} className="shrink-0 text-text-3 transition-colors group-focus-within:text-accent" />
            <input
              required
              disabled={mode === "edit"}
              placeholder={t("academicYear")}
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full bg-transparent text-sm text-text-1 outline-none placeholder:text-text-3 disabled:text-text-3"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select
            value={periodType}
            onChange={(e) => setPeriodType(e.target.value as (typeof PERIODS)[number])}
            disabled={mode === "edit"}
            className="rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-text-1 outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent-soft disabled:text-text-3"
          >
            {PERIODS.map((p) => (
              <option key={p} value={p}>
                {periodT(p)}
              </option>
            ))}
          </select>
          {mode === "edit" && (
            <IconToggle active={isActive} onClick={() => setIsActive((v) => !v)} icon={IconCircleCheck} label={isActive ? t("active") : t("inactive")} />
          )}
        </div>
      </SectionCard>

      <SectionCard icon={IconLayoutGrid} title={t("categoriesSection")}>
        {mode === "edit" && (
          <p className="mb-4 flex items-start gap-1.5 rounded-lg bg-accent-soft px-3 py-2 text-xs text-accent">
            <IconCertificate size={14} stroke={1.75} className="mt-0.5 shrink-0" />
            {t("rankOverrideHint")}
          </p>
        )}
        <div className="mb-5 space-y-1.5">
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-alt">
            {categories
              .filter((c) => !c.is_bonus_category)
              .map((c, i) => {
                const pct = Math.min(Number(c.max_score) || 0, 100);
                if (pct <= 0) return null;
                return (
                  <div
                    key={i}
                    style={{ width: `${pct}%` }}
                    className={`h-full transition-all duration-500 ${ACCENT_BAR_COLORS[i % ACCENT_BAR_COLORS.length]}`}
                  />
                );
              })}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-text-3">{t("scoreDistributionHint")}</span>
            <span
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold ${
                isValid ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
              }`}
            >
              {isValid ? <IconCircleCheck size={13} stroke={2} /> : <IconAlertTriangle size={13} stroke={2} />}
              {t("baseTotal", { total: baseTotal })}
              {bonusTotal > 0 ? ` + ${bonusTotal} (${t("bonusCategory").toLowerCase()})` : ""}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {categories.map((category, categoryIndex) => {
            const indicatorsTotal = category.indicators.reduce((sum, i) => sum + (Number(i.max_score) || 0), 0);
            const categoryValid = indicatorsTotal === (Number(category.max_score) || 0);
            const barColor = ACCENT_BAR_COLORS[categoryIndex % ACCENT_BAR_COLORS.length];
            return (
              <div key={categoryIndex} className="rounded-xl border border-border bg-bg p-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${barColor}`}>
                    {categoryIndex + 1}
                  </span>
                  <MiniField icon={IconFolderOpen} tone="surface">
                    <input
                      placeholder={t("categoryName")}
                      value={category.name}
                      onChange={(e) => updateCategory(categoryIndex, { name: e.target.value })}
                      className="min-w-[10rem] flex-1 bg-transparent text-sm text-text-1 outline-none placeholder:text-text-3"
                    />
                  </MiniField>
                  <div className="w-24">
                    <MiniField icon={IconHash} tone="surface">
                      <input
                        type="number"
                        min={0}
                        placeholder={t("maxScore")}
                        value={category.max_score}
                        onChange={(e) => updateCategory(categoryIndex, { max_score: e.target.value })}
                        className="w-full bg-transparent text-sm text-text-1 outline-none placeholder:text-text-3"
                      />
                    </MiniField>
                  </div>
                  {mode === "edit" && category.id != null && (
                    <RankOverrideFields
                      pair={categoryOverrides[category.id]}
                      titledLabel={t("maxScoreTitled")}
                      untitledLabel={t("maxScoreUntitled")}
                      onSave={(hasTitle, existing, value) =>
                        saveRankOverride("categories", "kpi_category_id", category.id as number, hasTitle, existing, value)
                      }
                    />
                  )}
                  <IconToggle
                    active={category.is_bonus_category}
                    onClick={() => updateCategory(categoryIndex, { is_bonus_category: !category.is_bonus_category })}
                    icon={IconGift}
                    label={t("bonusCategory")}
                  />
                  <IconToggle
                    active={category.requires_kafedra_endorsement}
                    onClick={() =>
                      updateCategory(categoryIndex, { requires_kafedra_endorsement: !category.requires_kafedra_endorsement })
                    }
                    icon={IconShieldCheck}
                    label={t("requiresEndorsement")}
                  />
                  <IconToggle
                    active={category.requires_head_approval}
                    onClick={() =>
                      updateCategory(categoryIndex, { requires_head_approval: !category.requires_head_approval })
                    }
                    icon={IconUserCheck}
                    label={t("requiresHeadApproval")}
                  />
                  {categories.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCategory(categoryIndex)}
                      className="ml-auto text-text-3 transition-colors hover:text-danger"
                      aria-label={t("removeCategory")}
                    >
                      <IconTrash size={16} stroke={1.75} />
                    </button>
                  )}
                </div>

                <div className="mt-3.5 space-y-2 border-l-2 pl-4" style={{ borderColor: "var(--border)" }}>
                  {category.indicators.map((indicator, indicatorIndex) => (
                    <div key={indicatorIndex} className="flex flex-wrap items-center gap-2 rounded-lg bg-surface p-2">
                      <MiniField icon={IconListCheck}>
                        <input
                          placeholder={t("indicatorName")}
                          value={indicator.name}
                          onChange={(e) => updateIndicator(categoryIndex, indicatorIndex, { name: e.target.value })}
                          className="min-w-[9rem] flex-1 bg-transparent text-sm text-text-1 outline-none placeholder:text-text-3"
                        />
                      </MiniField>
                      <div className="w-20">
                        <MiniField icon={IconHash}>
                          <input
                            type="number"
                            min={0}
                            placeholder={t("maxScore")}
                            value={indicator.max_score}
                            onChange={(e) => updateIndicator(categoryIndex, indicatorIndex, { max_score: e.target.value })}
                            className="w-full bg-transparent text-sm text-text-1 outline-none placeholder:text-text-3"
                          />
                        </MiniField>
                      </div>
                      {mode === "edit" && indicator.id != null && (
                        <RankOverrideFields
                          pair={indicatorOverrides[indicator.id]}
                          titledLabel={t("maxScoreTitled")}
                          untitledLabel={t("maxScoreUntitled")}
                          onSave={(hasTitle, existing, value) =>
                            saveRankOverride(
                              "indicators",
                              "kpi_indicator_id",
                              indicator.id as number,
                              hasTitle,
                              existing,
                              value,
                            )
                          }
                        />
                      )}
                      <IconToggle
                        active={indicator.allow_coauthors}
                        onClick={() => updateIndicator(categoryIndex, indicatorIndex, { allow_coauthors: !indicator.allow_coauthors })}
                        icon={IconUsersGroup}
                        label={t("allowCoauthors")}
                      />
                      <IconToggle
                        active={indicator.requires_file}
                        onClick={() => updateIndicator(categoryIndex, indicatorIndex, { requires_file: !indicator.requires_file })}
                        icon={IconPaperclip}
                        label={t("requiresFile")}
                      />
                      {category.indicators.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeIndicator(categoryIndex, indicatorIndex)}
                          className="ml-auto text-text-3 transition-colors hover:text-danger"
                          aria-label={t("removeIndicator")}
                        >
                          <IconTrash size={15} stroke={1.75} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addIndicator(categoryIndex)}
                    className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border py-1.5 text-xs font-medium text-text-3 transition-colors hover:border-accent hover:text-accent"
                  >
                    <IconPlus size={13} stroke={2} />
                    {t("addIndicator")}
                  </button>
                </div>

                <span
                  className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    categoryValid ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
                  }`}
                >
                  {categoryValid ? <IconCircleCheck size={13} stroke={2} /> : <IconAlertTriangle size={13} stroke={2} />}
                  {t("indicatorsTotal", { total: indicatorsTotal, max: Number(category.max_score) || 0 })}
                </span>
              </div>
            );
          })}
          <button
            type="button"
            onClick={addCategory}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-3 text-sm font-medium text-text-3 transition-colors hover:border-accent hover:text-accent"
          >
            <IconPlus size={16} stroke={1.75} />
            {t("addCategory")}
          </button>
        </div>
      </SectionCard>

      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft">
        <button
          type="submit"
          disabled={submitting || !isValid || !name || !annexCode || !academicYear}
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-90 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
        >
          {submitting ? t("saving") : t("save")}
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard/templates")}
          className="text-sm font-medium text-text-3 transition-colors hover:text-text-1"
        >
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}
