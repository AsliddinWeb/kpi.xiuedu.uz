"use client";

import { useEffect, useState } from "react";

const BARS = [38, 62, 48, 78, 58, 92];
const TARGET_SCORE = 92;

export default function PreviewMock({
  applicationsLabel,
  resultLabel,
  annexLabel,
  periodLabel,
}: {
  applicationsLabel: string;
  resultLabel: string;
  annexLabel: string;
  periodLabel: string;
}) {
  const [score, setScore] = useState(0);
  const [barsIn, setBarsIn] = useState(false);

  useEffect(() => {
    const startDelay = setTimeout(() => setBarsIn(true), 150);
    let raf: number;
    const start = performance.now();
    const duration = 1100;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setScore(Math.round(eased * TARGET_SCORE));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    const rafDelay = setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, 300);

    return () => {
      clearTimeout(startDelay);
      clearTimeout(rafDelay);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="relative mt-14 h-60">
      <div className="absolute left-0 top-10 w-44 animate-float-a rounded-2xl bg-white/10 p-3.5 ring-1 ring-inset ring-white/15 backdrop-blur-sm">
        <p className="text-[11px] font-medium text-white/60">{applicationsLabel}</p>
        <div className="mt-3 flex h-14 items-end gap-1.5">
          {BARS.map((h, i) => (
            <div
              key={i}
              className={`w-2.5 rounded-full transition-all duration-700 ease-out ${
                i === BARS.length - 1 ? "bg-white" : "bg-white/40"
              }`}
              style={{ height: barsIn ? `${h}%` : "4%", transitionDelay: `${i * 70}ms` }}
            />
          ))}
        </div>
      </div>

      <div className="absolute right-0 top-0 w-44 animate-float-b rounded-2xl bg-white p-3.5 shadow-lg">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium text-text-3">{resultLabel}</p>
          <span className="flex items-center gap-1 rounded-full bg-success-soft px-1.5 py-0.5 text-[10px] font-semibold text-success">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
            </span>
            #1
          </span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div
            className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full transition-[background] duration-150"
            style={{ background: `conic-gradient(#4c5fee ${score * 3.6}deg, #eef0f5 0deg)` }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white">
              <span className="text-base font-bold text-text-1">{score}</span>
            </div>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-1">{annexLabel}</p>
            <p className="text-xs text-text-3">{periodLabel}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
