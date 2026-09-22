"use client";

import { useEffect, useId, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type RankingBarRow = { name: string; value: number; hasData: boolean };

export default function RankingBarChart({ rows, max = 100 }: { rows: RankingBarRow[]; max?: number }) {
  const [mounted, setMounted] = useState(false);
  const gradientId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  const height = Math.max(rows.length * 40, 110);

  return (
    <div style={{ height }}>
      {mounted ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.55} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={1} />
              </linearGradient>
            </defs>
            <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="4 4" />
            <XAxis type="number" domain={[0, max]} tick={{ fontSize: 11, fill: "var(--text-3)" }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              width={110}
              tick={{ fontSize: 12, fill: "var(--text-2)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "var(--surface-alt)" }}
              formatter={(value: number, _name, entry) => [entry?.payload?.hasData ? `${value}` : "—", ""]}
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                fontSize: 12,
                boxShadow: "var(--shadow-lg)",
              }}
              labelFormatter={() => ""}
            />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} animationDuration={800} animationEasing="ease-out" maxBarSize={20}>
              {rows.map((entry, index) => (
                <Cell key={index} fill={entry.hasData ? `url(#${gradientId})` : "var(--surface-alt)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="skeleton h-full w-full rounded-lg" />
      )}
    </div>
  );
}
