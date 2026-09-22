"use client";

import {
  IconAlertTriangle,
  IconBuilding,
  IconBuildingSkyscraper,
  IconChalkboard,
  IconCheck,
  IconInfoCircle,
  IconSitemap,
} from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Department, DepartmentType } from "@/lib/departments";
import FormSection from "@/components/ui/FormSection";
import IconField from "@/components/ui/IconField";

const TYPE_OPTIONS: { value: DepartmentType; icon: typeof IconBuilding }[] = [
  { value: "faculty", icon: IconBuildingSkyscraper },
  { value: "kafedra", icon: IconChalkboard },
  { value: "administrative", icon: IconBuilding },
];

const TYPE_TONE: Record<DepartmentType, string> = {
  faculty: "bg-accent-soft text-accent",
  kafedra: "bg-success-soft text-success",
  administrative: "bg-surface-alt text-text-2",
};

function descendantIds(departments: Department[], rootId: number): Set<number> {
  const ids = new Set<number>([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const d of departments) {
      if (d.parent_department_id != null && ids.has(d.parent_department_id) && !ids.has(d.id)) {
        ids.add(d.id);
        changed = true;
      }
    }
  }
  return ids;
}

export default function DepartmentForm({
  mode,
  department,
  departments,
}: {
  mode: "create" | "edit";
  department: Department | null;
  departments: Department[];
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("structure");

  const [name, setName] = useState(department?.name ?? "");
  const [departmentType, setDepartmentType] = useState<DepartmentType>(department?.department_type ?? "administrative");
  const [parentId, setParentId] = useState(department?.parent_department_id ? String(department.parent_department_id) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const excludedIds = department ? descendantIds(departments, department.id) : new Set<number>();
  const parentOptions = departments.filter((d) => !excludedIds.has(d.id));
  const parentDepartment = departments.find((d) => String(d.id) === parentId);
  const TypeIcon = TYPE_OPTIONS.find((o) => o.value === departmentType)!.icon;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setSaving(true);
    try {
      const body = JSON.stringify({
        name: name.trim(),
        department_type: departmentType,
        parent_department_id: parentId ? Number(parentId) : null,
      });
      const res =
        mode === "create"
          ? await fetch("/api/v1/departments", {
              method: "POST",
              headers: { "Content-Type": "application/json", "Accept-Language": locale },
              credentials: "include",
              body,
            })
          : await fetch(`/api/v1/departments/${department!.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json", "Accept-Language": locale },
              credentials: "include",
              body,
            });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        setError(errBody?.detail ?? t("genericError"));
        return;
      }
      router.push("/dashboard/structure");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-5">
      {error && (
        <p className="flex items-center gap-2 rounded-lg border border-danger-soft bg-danger-soft px-3 py-2.5 text-sm text-danger">
          <IconAlertTriangle size={16} stroke={1.75} className="shrink-0" />
          {error}
        </p>
      )}

      <FormSection icon={IconInfoCircle} title={t("basicInfo")}>
        <div className="mb-4 flex items-center gap-3 rounded-lg bg-bg p-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${TYPE_TONE[departmentType]}`}>
            <TypeIcon size={18} stroke={1.75} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-1">{name.trim() || t("namePlaceholder")}</p>
            <p className="text-xs text-text-3">
              {t(`types.${departmentType}`)}
              {parentDepartment ? ` · ${parentDepartment.name}` : ""}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-2">{t("namePlaceholder")}</label>
            <IconField icon={IconBuilding}>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent text-sm text-text-1 outline-none"
              />
            </IconField>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-2">{t("type")}</label>
            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map(({ value, icon: Icon }) => {
                const active = departmentType === value;
                return (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setDepartmentType(value)}
                    className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                      active ? "bg-accent text-white shadow-sm" : "bg-surface-alt text-text-2 hover:text-text-1"
                    }`}
                  >
                    <Icon size={16} stroke={1.75} />
                    {t(`types.${value}`)}
                    {active && <IconCheck size={14} stroke={2.25} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-2">{t("parentLabel")}</label>
            <IconField icon={IconSitemap}>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full bg-transparent text-sm text-text-1 outline-none"
              >
                <option value="">{t("noParent")}</option>
                {parentOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </IconField>
            {departmentType === "kafedra" && !parentId && (
              <p className="flex items-start gap-1.5 text-xs text-warning">
                <IconAlertTriangle size={13} stroke={1.75} className="mt-0.5 shrink-0" />
                {t("kafedraNoParentHint")}
              </p>
            )}
          </div>
        </div>
      </FormSection>

      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft">
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-90 active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? t("saving") : t("save")}
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard/structure")}
          className="text-sm font-medium text-text-3 transition-colors hover:text-text-1"
        >
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}
