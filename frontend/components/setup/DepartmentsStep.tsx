"use client";

import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

export type DepartmentDraft = { name: string; positions: string[] };

type Props = {
  data: { departments: DepartmentDraft[] };
  onChange: (patch: Partial<{ departments: DepartmentDraft[] }>) => void;
};

export default function DepartmentsStep({ data, onChange }: Props) {
  const t = useTranslations("setup.departments");

  function set(next: DepartmentDraft[]) {
    onChange({ departments: next });
  }

  function addDepartment() {
    set([...data.departments, { name: "", positions: [""] }]);
  }

  function removeDepartment(index: number) {
    set(data.departments.filter((_, i) => i !== index));
  }

  function updateDepartmentName(index: number, name: string) {
    set(data.departments.map((d, i) => (i === index ? { ...d, name } : d)));
  }

  function addPosition(deptIndex: number) {
    set(data.departments.map((d, i) => (i === deptIndex ? { ...d, positions: [...d.positions, ""] } : d)));
  }

  function updatePosition(deptIndex: number, posIndex: number, title: string) {
    set(
      data.departments.map((d, i) =>
        i === deptIndex ? { ...d, positions: d.positions.map((p, j) => (j === posIndex ? title : p)) } : d
      )
    );
  }

  function removePosition(deptIndex: number, posIndex: number) {
    set(
      data.departments.map((d, i) =>
        i === deptIndex ? { ...d, positions: d.positions.filter((_, j) => j !== posIndex) } : d
      )
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-text-1">{t("heading")}</h2>

      <div className="space-y-3">
        {data.departments.map((dept, deptIndex) => (
          <div key={deptIndex} className="rounded-lg border border-border bg-surface-alt p-3">
            <div className="flex items-center gap-2">
              <input
                value={dept.name}
                onChange={(e) => updateDepartmentName(deptIndex, e.target.value)}
                placeholder={t("namePlaceholder")}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-1 outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent-soft"
              />
              {data.departments.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDepartment(deptIndex)}
                  className="shrink-0 text-text-3 transition-colors hover:text-danger"
                  aria-label={t("removeDepartment")}
                >
                  <IconTrash size={16} stroke={1.75} />
                </button>
              )}
            </div>

            <div className="mt-2.5 space-y-2 pl-4">
              {dept.positions.map((pos, posIndex) => (
                <div key={posIndex} className="flex items-center gap-2">
                  <input
                    value={pos}
                    onChange={(e) => updatePosition(deptIndex, posIndex, e.target.value)}
                    placeholder={t("positionPlaceholder")}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-1 outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent-soft"
                  />
                  {dept.positions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePosition(deptIndex, posIndex)}
                      className="shrink-0 text-text-3 transition-colors hover:text-danger"
                      aria-label={t("removePosition")}
                    >
                      <IconTrash size={14} stroke={1.75} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addPosition(deptIndex)}
                className="flex items-center gap-1 text-xs font-medium text-accent transition-opacity hover:opacity-75"
              >
                <IconPlus size={14} stroke={1.75} />
                {t("addPosition")}
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addDepartment}
        className="flex items-center gap-1 text-sm font-medium text-accent transition-opacity hover:opacity-75"
      >
        <IconPlus size={16} stroke={1.75} />
        {t("addDepartment")}
      </button>
    </div>
  );
}
