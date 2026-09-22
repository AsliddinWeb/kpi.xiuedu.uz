"use client";

import {
  IconBriefcase,
  IconBuilding,
  IconBuildingCommunity,
  IconBuildingSkyscraper,
  IconChalkboard,
  IconCoins,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo, useState } from "react";
import BreakdownDonutCard from "@/components/dashboard/BreakdownDonutCard";
import RankingBarChart from "@/components/dashboard/RankingBarChart";
import type { Department, DepartmentType } from "@/lib/departments";
import ActionMenu from "@/components/ui/ActionMenu";

const TYPE_ICON: Record<DepartmentType, typeof IconBuilding> = {
  faculty: IconBuildingSkyscraper,
  kafedra: IconChalkboard,
  administrative: IconBuilding,
};

const TYPE_TONE: Record<DepartmentType, string> = {
  faculty: "bg-accent-soft text-accent",
  kafedra: "bg-success-soft text-success",
  administrative: "bg-surface-alt text-text-2",
};

function StatChip({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof IconBuilding;
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

export default function StructureManager({ initialDepartments }: { initialDepartments: Department[] }) {
  const locale = useLocale();
  const t = useTranslations("structure");
  const [departments, setDepartments] = useState(initialDepartments);
  const [error, setError] = useState<string | null>(null);

  const tree = useMemo(() => {
    const byParent = new Map<number | null, Department[]>();
    for (const dept of departments) {
      const key = dept.parent_department_id;
      byParent.set(key, [...(byParent.get(key) ?? []), dept]);
    }
    return byParent;
  }, [departments]);

  const roots = tree.get(null) ?? [];
  const facultyRoots = roots.filter((d) => d.department_type === "faculty");
  const kafedraRoots = roots.filter((d) => d.department_type === "kafedra");
  const administrativeRoots = roots.filter((d) => d.department_type === "administrative");

  const stats = useMemo(
    () => ({
      total: departments.length,
      faculties: departments.filter((d) => d.department_type === "faculty").length,
      kafedras: departments.filter((d) => d.department_type === "kafedra").length,
      administrative: departments.filter((d) => d.department_type === "administrative").length,
    }),
    [departments],
  );

  const topByPositions = useMemo(
    () =>
      departments
        .map((d) => ({ name: d.name, value: d.positions.length, hasData: true }))
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 6),
    [departments],
  );

  async function refresh() {
    const res = await fetch("/api/v1/departments", {
      headers: { "Accept-Language": locale },
      credentials: "include",
      cache: "no-store",
    });
    if (res.ok) setDepartments(await res.json());
  }

  async function deleteDepartment(id: number) {
    if (!window.confirm(t("deleteConfirmDepartment"))) return;
    setError(null);
    const res = await fetch(`/api/v1/departments/${id}`, {
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
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-lg border border-danger-soft bg-danger-soft px-3 py-2.5 text-sm text-danger">{error}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        <StatChip icon={IconBuildingCommunity} label={t("totalCount")} value={stats.total} tone="text-text-2" />
        <StatChip icon={IconBuildingSkyscraper} label={t("facultiesCount")} value={stats.faculties} tone="text-accent" />
        <StatChip icon={IconChalkboard} label={t("kafedrasCount")} value={stats.kafedras} tone="text-success" />
        <StatChip icon={IconBuilding} label={t("administrativeCount")} value={stats.administrative} tone="text-text-2" />
      </div>

      {stats.total > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <BreakdownDonutCard
            title={t("typeBreakdown")}
            segments={[
              { label: t("facultiesCount"), value: stats.faculties, colorVar: "var(--accent)" },
              { label: t("kafedrasCount"), value: stats.kafedras, colorVar: "var(--success)" },
              { label: t("administrativeCount"), value: stats.administrative, colorVar: "var(--text-3)" },
            ]}
          />
          <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
            <p className="mb-4 text-sm font-semibold text-text-1">{t("topByPositions")}</p>
            {topByPositions.length === 0 ? (
              <p className="text-sm text-text-3">{t("noPositionsYet")}</p>
            ) : (
              <RankingBarChart rows={topByPositions} max={Math.max(...topByPositions.map((d) => d.value), 1)} />
            )}
          </div>
        </div>
      )}

      <Link
        href="/dashboard/structure/new"
        className="flex w-fit items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-90 active:scale-[0.98]"
      >
        <IconPlus size={16} stroke={2.25} />
        {t("addDepartment")}
      </Link>

      {roots.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-surface px-6 py-14 text-center">
          <IconBuildingCommunity size={32} stroke={1.5} className="text-text-3" />
          <p className="text-sm font-semibold text-text-1">{t("emptyTitle")}</p>
          <p className="max-w-xs text-xs text-text-3">{t("emptyHint")}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {facultyRoots.length > 0 && (
            <Section title={t("facultiesSection")} icon={IconBuildingSkyscraper}>
              {facultyRoots.map((dept) => (
                <DepartmentNode key={dept.id} department={dept} childrenByParent={tree} depth={0} onDelete={deleteDepartment} />
              ))}
            </Section>
          )}
          {kafedraRoots.length > 0 && (
            <Section title={t("kafedrasSection")} icon={IconChalkboard}>
              {kafedraRoots.map((dept) => (
                <DepartmentNode key={dept.id} department={dept} childrenByParent={tree} depth={0} onDelete={deleteDepartment} />
              ))}
            </Section>
          )}
          {administrativeRoots.length > 0 && (
            <Section title={t("administrativeSection")} icon={IconBuilding}>
              {administrativeRoots.map((dept) => (
                <DepartmentNode key={dept.id} department={dept} childrenByParent={tree} depth={0} onDelete={deleteDepartment} />
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof IconBuilding; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Icon size={15} stroke={1.75} className="text-text-3" />
        <h2 className="text-sm font-semibold text-text-1">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function DepartmentNode({
  department,
  childrenByParent,
  depth,
  onDelete,
}: {
  department: Department;
  childrenByParent: Map<number | null, Department[]>;
  depth: number;
  onDelete: (id: number) => void;
}) {
  const t = useTranslations("structure");
  const children = childrenByParent.get(department.id) ?? [];
  const TypeIcon = TYPE_ICON[department.department_type];

  return (
    <div className={depth > 0 ? "mt-3 ml-6 border-l border-border pl-4" : "mt-3 first:mt-0"}>
      <div className="rounded-xl border border-border bg-surface shadow-soft transition-all hover:shadow-lg">
        <div className="flex items-center gap-3 p-4">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TYPE_TONE[department.department_type]}`}>
            <TypeIcon size={18} stroke={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-text-1">{department.name}</h3>
              <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${TYPE_TONE[department.department_type]}`}>
                {t(`types.${department.department_type}`)}
              </span>
            </div>
            {department.positions.length > 0 && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-text-3">
                <IconBriefcase size={12} stroke={1.75} />
                {t("positionsCount", { count: department.positions.length })}
              </p>
            )}
          </div>
          <ActionMenu
            label={t("actions")}
            items={[
              { label: t("edit"), icon: IconPencil, href: `/dashboard/structure/${department.id}/edit` },
              { label: t("delete"), icon: IconTrash, tone: "danger", onClick: () => onDelete(department.id) },
            ]}
          />
        </div>
        {department.positions.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
            {department.positions.map((position) => (
              <span
                key={position.id}
                className="flex items-center gap-1.5 rounded-lg bg-bg px-2.5 py-1.5 text-xs text-text-2"
              >
                <IconBriefcase size={12} stroke={1.75} className="text-text-3" />
                {position.title}
                {position.bonus_fund != null && (
                  <span className="flex items-center gap-1 text-text-3">
                    <IconCoins size={11} stroke={1.75} />
                    {position.bonus_fund.toLocaleString()}
                  </span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
      {children.map((child) => (
        <DepartmentNode key={child.id} department={child} childrenByParent={childrenByParent} depth={depth + 1} onDelete={onDelete} />
      ))}
    </div>
  );
}
