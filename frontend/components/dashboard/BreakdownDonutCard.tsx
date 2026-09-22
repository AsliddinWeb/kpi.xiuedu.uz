"use client";

import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

type Segment = { label: string; value: number; colorVar: string };

export default function BreakdownDonutCard({ title, segments }: { title: string; segments: Segment[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const hasData = total > 0;
  const data = hasData ? segments : [{ label: "", value: 1, colorVar: "var(--surface-alt)" }];

  return (
    <div className="relative animate-fade-up overflow-hidden rounded-xl border border-border bg-gradient-to-br from-warning-soft/40 via-surface to-surface p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-warning via-warning/60 to-transparent" aria-hidden />
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-warning-soft/50 blur-3xl" aria-hidden />
      <p className="relative mb-3 text-sm font-semibold text-text-1">{title}</p>
      <div className="relative flex items-center gap-5">
        <div className="relative h-28 w-28 shrink-0">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="label"
                  innerRadius="68%"
                  outerRadius="100%"
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                  paddingAngle={hasData && segments.length > 1 ? 3 : 0}
                  cornerRadius={6}
                  animationDuration={800}
                  animationEasing="ease-out"
                  isAnimationActive
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.colorVar} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="skeleton h-full w-full rounded-full" />
          )}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold tabular-nums text-text-1">{total}</span>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          {segments.map((s) => (
            <div key={s.label} className="flex items-center gap-2 text-xs">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.colorVar }} />
              <span className="min-w-0 flex-1 truncate text-text-2">{s.label}</span>
              <span className="shrink-0 font-semibold tabular-nums text-text-1">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
