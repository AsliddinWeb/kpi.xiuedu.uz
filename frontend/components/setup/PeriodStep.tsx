"use client";

import { IconCalendarMonth, IconCalendarStats, IconCalendarWeek, IconCheck } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

export type PeriodType = "monthly" | "quarterly" | "yearly";

type Props = {
  data: { periodType: PeriodType };
  onChange: (patch: Partial<{ periodType: PeriodType }>) => void;
};

const OPTIONS: { value: PeriodType; icon: typeof IconCalendarMonth }[] = [
  { value: "monthly", icon: IconCalendarWeek },
  { value: "quarterly", icon: IconCalendarMonth },
  { value: "yearly", icon: IconCalendarStats },
];

export default function PeriodStep({ data, onChange }: Props) {
  const t = useTranslations("setup.period");

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-text-1">{t("heading")}</h2>
      <p className="text-sm text-text-2">{t("description")}</p>
      <div className="space-y-2">
        {OPTIONS.map(({ value, icon: Icon }) => {
          const active = data.periodType === value;
          return (
            <label
              key={value}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-3 text-sm transition-colors ${
                active ? "border-accent bg-accent-soft text-accent" : "border-border text-text-1 hover:bg-surface-alt"
              }`}
            >
              <input
                type="radio"
                name="periodType"
                checked={active}
                onChange={() => onChange({ periodType: value })}
                className="sr-only"
              />
              <Icon size={18} stroke={1.75} className="shrink-0" />
              <span className="flex-1 font-medium">{t(value)}</span>
              {active && <IconCheck size={16} stroke={2} className="shrink-0" />}
            </label>
          );
        })}
      </div>
    </div>
  );
}
