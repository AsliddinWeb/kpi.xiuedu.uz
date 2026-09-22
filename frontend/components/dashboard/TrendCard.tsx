"use client";

import { useEffect, useId, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type DataPoint = { label: string; value: number };

export default function TrendCard({ title, data }: { title: string; data: DataPoint[] }) {
  const [mounted, setMounted] = useState(false);
  const gradientId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative animate-fade-up overflow-hidden rounded-xl border border-border bg-gradient-to-br from-accent-soft/30 via-surface to-surface p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-accent via-accent/60 to-transparent" aria-hidden />
      <p className="relative mb-4 text-sm font-semibold text-text-1">{title}</p>
      <div className="relative h-48">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--text-3)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--text-3)" }} axisLine={false} tickLine={false} width={36} />
              <Tooltip
                cursor={{ stroke: "var(--accent)", strokeWidth: 1, strokeDasharray: "3 3" }}
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  fontSize: 12,
                  boxShadow: "var(--shadow-lg)",
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--accent)"
                strokeWidth={2.5}
                fill={`url(#${gradientId})`}
                dot={{ r: 3, fill: "var(--accent)", strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
                animationDuration={900}
                animationEasing="ease-out"
                isAnimationActive
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="skeleton h-full w-full rounded-lg" />
        )}
      </div>
    </div>
  );
}
