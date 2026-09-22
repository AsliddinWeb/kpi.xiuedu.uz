"use client";

import { useEffect, useId, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

type Props = {
  title: string;
  percent: number;
  label?: string;
};

export default function ScoreDonutCard({ title, percent, label }: Props) {
  const [mounted, setMounted] = useState(false);
  const gradientId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  const clamped = Math.max(0, Math.min(percent, 100));
  const isPartial = clamped > 0 && clamped < 100;
  const data = [
    { name: "filled", value: clamped },
    { name: "empty", value: 100 - clamped },
  ];

  return (
    <div className="relative animate-fade-up overflow-hidden rounded-xl border border-border bg-gradient-to-br from-accent-soft/40 via-surface to-surface p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-accent via-accent/60 to-transparent" aria-hidden />
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent-soft/60 blur-3xl" aria-hidden />
      <p className="relative mb-2 text-sm font-semibold text-text-1">{title}</p>
      <div className="relative h-40">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" />
                  <stop offset="100%" stopColor="#8b93f5" />
                </linearGradient>
              </defs>
              <Pie
                data={data}
                dataKey="value"
                innerRadius="72%"
                outerRadius="100%"
                startAngle={90}
                endAngle={-270}
                stroke="none"
                cornerRadius={10}
                paddingAngle={isPartial ? 3 : 0}
                animationDuration={900}
                animationEasing="ease-out"
                isAnimationActive
              >
                <Cell fill={`url(#${gradientId})`} />
                <Cell fill="var(--accent-soft)" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="skeleton h-full w-full rounded-full" />
        )}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tracking-tight tabular-nums text-text-1">{Math.round(percent)}%</span>
          {label && <span className="text-xs text-text-3">{label}</span>}
        </div>
      </div>
    </div>
  );
}
